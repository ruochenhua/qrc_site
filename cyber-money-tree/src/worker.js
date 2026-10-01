import { composePhrase, isPhraseCombinationAllowed, isPosterUnlocked, POSTERS } from '../shared/catalog.js';
import { getGrowthStage } from '../shared/progression.js';
import { getNextMilestone } from '../shared/milestones.js';
import { countConsecutiveCommons, PITY_AFTER, rollRarity } from '../shared/rarity.js';
import { ACHIEVEMENTS, COMBO_WINDOW_MS, PUBLIC_ACHIEVEMENTS, SECRET_ACHIEVEMENTS, getAchievementProgress } from '../shared/achievements.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 2048;
const WATER_COOLDOWN_MS = 3000;
const PHRASE_ECHO_WINDOW_MS = 24 * 60 * 60 * 1000;
const WALL_SIZE = 10;
const WALL_FEATURED_COUNT = 3;
const HEARTBEAT_MIN_INTERVAL_MS = 30000;
const PRESENCE_WINDOW_MS = 60000;

function responseHeaders(origin, env) {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  const allowedOrigins = String(env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (origin && allowedOrigins.includes(origin)) {
    headers.set('access-control-allow-origin', origin);
    headers.set('vary', 'Origin');
    headers.set('access-control-allow-methods', 'GET, POST, OPTIONS');
    headers.set('access-control-allow-headers', 'Content-Type, X-Visitor-Id');
    headers.set('access-control-max-age', '86400');
  }
  return headers;
}

function json(data, status, origin, env) {
  return new Response(JSON.stringify(data), { status, headers: responseHeaders(origin, env) });
}

function error(code, message, status, origin, env, extra = {}) {
  return json({ error: { code, message, ...extra } }, status, origin, env);
}

function validVisitorId(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

async function visitorHash(visitorId) {
  const bytes = new TextEncoder().encode(visitorId.toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function findPoster(posterId) {
  return POSTERS.find((poster) => poster.id === posterId) ?? null;
}

function toLeafCard(row) {
  const poster = findPoster(row.poster_id);
  const phrase = composePhrase(row.subject_id, row.ending_id);
  if (!poster || !phrase) return null;
  return {
    id: row.id,
    waterNo: row.water_no ?? null,
    posterId: poster.id,
    posterTitle: poster.title,
    posterAsset: poster.asset,
    subjectId: row.subject_id,
    endingId: row.ending_id,
    phrase,
    source: row.source,
    rarity: row.rarity ?? 'common',
    createdAt: row.created_at,
    likes: Number(row.like_count ?? 0),
    isLiked: Boolean(row.is_liked),
  };
}

async function getTotalWaterings(db) {
  const row = await db.prepare('SELECT total_waterings FROM tree_stats WHERE id = 1').first();
  return Number(row?.total_waterings ?? 0);
}

async function getLeafCount(db) {
  const row = await db.prepare('SELECT COUNT(*) AS count FROM leaf_notes').first();
  return Number(row?.count ?? 0);
}

async function getCommunityMetrics(db) {
  const row = await db.prepare(
    `SELECT
       COALESCE((SELECT total_waterings FROM tree_stats WHERE id = 1), 0) AS total_waterings,
       (SELECT COUNT(DISTINCT visitor_hash) FROM waterings) AS unique_visitors,
       (SELECT COUNT(*) FROM leaf_notes WHERE source = 'visitor') AS visitor_leaves,
       COALESCE((SELECT segment_count FROM combo_state WHERE id = 1), 0) AS combo_segments`,
  ).first();
  return {
    totalWaterings: Number(row?.total_waterings ?? 0),
    uniqueVisitors: Number(row?.unique_visitors ?? 0),
    visitorLeaves: Number(row?.visitor_leaves ?? 0),
    comboSegments: Number(row?.combo_segments ?? 0),
  };
}

async function unlockAchievement(db, achievementId, now = Date.now(), valueAtUnlock = null) {
  const achievement = ACHIEVEMENTS.find((item) => item.id === achievementId);
  if (!achievement) return false;
  const result = await db.prepare(
    'INSERT OR IGNORE INTO community_achievements (achievement_id, unlocked_at, value_at_unlock) VALUES (?, ?, ?)',
  ).bind(achievementId, now, valueAtUnlock).run();
  return Number(result.meta?.changes ?? 0) > 0;
}

async function evaluateMetricAchievements(db, now = Date.now()) {
  const metrics = await getCommunityMetrics(db);
  const newlyUnlocked = [];
  for (const achievement of PUBLIC_ACHIEVEMENTS) {
    if (metrics[achievement.metric] >= achievement.threshold
      && await unlockAchievement(db, achievement.id, now, metrics[achievement.metric])) {
      newlyUnlocked.push(achievement.id);
    }
  }
  return { metrics, newlyUnlocked };
}

async function getAchievementSnapshot(db, metrics = null) {
  const resolvedMetrics = metrics ?? await getCommunityMetrics(db);
  const unlockedResult = await db.prepare(
    'SELECT achievement_id, unlocked_at FROM community_achievements',
  ).all();
  const unlockedRows = unlockedResult.results ?? [];
  const unlocked = new Map(unlockedRows.map((row) => [row.achievement_id, Number(row.unlocked_at)]));
  const achievements = PUBLIC_ACHIEVEMENTS.map((achievement) => ({
    id: achievement.id,
    track: achievement.track,
    metric: achievement.metric,
    title: achievement.title,
    description: achievement.description,
    posterId: achievement.posterId,
    posterTitle: achievement.posterTitle,
    posterAsset: achievement.posterAsset,
    artworkStatus: achievement.artworkStatus ?? 'ready',
    threshold: achievement.threshold,
    ...getAchievementProgress(achievement, resolvedMetrics),
    unlocked: unlocked.has(achievement.id),
    unlockedAt: unlocked.get(achievement.id) ?? null,
  }));
  const secretAchievements = SECRET_ACHIEVEMENTS
    .filter((achievement) => unlocked.has(achievement.id))
    .map((achievement) => ({
      id: achievement.id,
      track: achievement.track,
      metric: null,
      title: achievement.title,
      description: achievement.description,
      posterId: achievement.posterId,
      posterTitle: achievement.posterTitle,
      posterAsset: achievement.posterAsset,
      artworkStatus: achievement.artworkStatus ?? 'ready',
      threshold: null,
      value: null,
      remaining: 0,
      progress: 1,
      unlocked: true,
      unlockedAt: unlocked.get(achievement.id),
      secret: true,
    }));
  const unlockedAchievementIds = [...unlocked.keys()];
  return {
    achievements: [...achievements, ...secretAchievements],
    unlockedAchievementIds,
    unlockedCount: unlockedAchievementIds.length,
    publicAchievementCount: PUBLIC_ACHIEVEMENTS.length,
    hiddenSecretCount: SECRET_ACHIEVEMENTS.length - secretAchievements.length,
  };
}

async function getUnlockedAchievementIds(db) {
  const result = await db.prepare('SELECT achievement_id FROM community_achievements').all();
  return (result.results ?? []).map((row) => row.achievement_id);
}

async function updateComboSegment(db, visitorHashValue, now) {
  const expired = `excluded.last_distinct_at - combo_state.last_distinct_at > ${COMBO_WINDOW_MS}`;
  const newPartner = `combo_state.qualified = 0 AND combo_state.first_visitor_hash != excluded.last_visitor_hash`;
  const nextPartner = `combo_state.qualified = 1 AND combo_state.last_visitor_hash != excluded.last_visitor_hash`;
  await db.prepare(
    `INSERT INTO combo_state (id, first_visitor_hash, last_visitor_hash, last_distinct_at, qualified, segment_count)
     VALUES (1, ?, ?, ?, 0, 0)
     ON CONFLICT(id) DO UPDATE SET
       first_visitor_hash = CASE WHEN ${expired} THEN excluded.first_visitor_hash ELSE combo_state.first_visitor_hash END,
       last_visitor_hash = CASE
         WHEN ${expired} OR (${newPartner}) OR (${nextPartner}) THEN excluded.last_visitor_hash
         ELSE combo_state.last_visitor_hash END,
       last_distinct_at = CASE
         WHEN ${expired} OR (${newPartner}) OR (${nextPartner}) THEN excluded.last_distinct_at
         ELSE combo_state.last_distinct_at END,
       qualified = CASE WHEN ${expired} THEN 0 WHEN ${newPartner} THEN 1 ELSE combo_state.qualified END,
       segment_count = combo_state.segment_count + CASE
         WHEN NOT (${expired}) AND (${newPartner}) THEN 1 ELSE 0 END`,
  ).bind(visitorHashValue, visitorHashValue, now).run();
  const row = await db.prepare('SELECT segment_count FROM combo_state WHERE id = 1').first();
  return Number(row?.segment_count ?? 0);
}

async function getWall(request, env, origin) {
  const visitorId = request.headers.get('x-visitor-id');
  if (visitorId && !validVisitorId(visitorId)) {
    return error('invalid_visitor', '浏览器编号无效，请刷新页面后重试。', 400, origin, env);
  }
  const hash = visitorId ? await visitorHash(visitorId) : null;
  const featuredLimit = WALL_FEATURED_COUNT;
  const randomLimit = WALL_SIZE - featuredLimit;
  const [leafCount, featuredResult] = await Promise.all([
    getLeafCount(env.DB),
    env.DB.prepare(
      `SELECT ln.id, ln.water_no, ln.poster_id, ln.subject_id, ln.ending_id, ln.created_at, ln.source, ln.rarity,
              COUNT(ll.leaf_id) AS like_count
       FROM leaf_notes ln LEFT JOIN leaf_likes ll ON ll.leaf_id = ln.id
       GROUP BY ln.id ORDER BY like_count DESC, ln.id DESC LIMIT ?`,
    ).bind(featuredLimit).all(),
  ]);
  const featured = featuredResult.results ?? [];
  const featuredIds = featured.map((row) => Number(row.id));
  const placeholders = featuredIds.length ? featuredIds.map(() => '?').join(', ') : null;
  const randomSql = `SELECT ln.id, ln.water_no, ln.poster_id, ln.subject_id, ln.ending_id, ln.created_at, ln.source, ln.rarity,
                            COUNT(ll.leaf_id) AS like_count
                     FROM leaf_notes ln LEFT JOIN leaf_likes ll ON ll.leaf_id = ln.id
                     ${placeholders ? `WHERE ln.id NOT IN (${placeholders})` : ''}
                     GROUP BY ln.id ORDER BY RANDOM() LIMIT ?`;
  const randomQuery = env.DB.prepare(randomSql);
  const randomResult = await (featuredIds.length
    ? randomQuery.bind(...featuredIds, randomLimit).all()
    : randomQuery.bind(randomLimit).all());
  const rows = [...featured, ...(randomResult.results ?? [])];
  const likedIds = new Set();
  if (hash && rows.length) {
    const rowPlaceholders = rows.map(() => '?').join(', ');
    const liked = await env.DB.prepare(
      `SELECT leaf_id FROM leaf_likes WHERE visitor_hash = ? AND leaf_id IN (${rowPlaceholders})`,
    ).bind(hash, ...rows.map((row) => row.id)).all();
    for (const row of liked.results ?? []) likedIds.add(Number(row.leaf_id));
  }
  const leaves = rows
    .map((row) => toLeafCard({ ...row, is_liked: likedIds.has(Number(row.id)) }))
    .filter(Boolean)
    .sort((left, right) => right.likes - left.likes || Number(right.id) - Number(left.id));
  return json({
    leaves,
    leafCount,
    featuredCount: Math.min(WALL_FEATURED_COUNT, featured.length),
    randomCount: leaves.length - Math.min(WALL_FEATURED_COUNT, featured.length),
  }, 200, origin, env);
}

async function getActiveVisitors(db, now = Date.now()) {
  const cutoff = now - PRESENCE_WINDOW_MS;
  const row = await db.prepare('SELECT COUNT(*) AS count FROM presence WHERE last_seen > ?')
    .bind(cutoff)
    .first();
  return Number(row?.count ?? 0);
}

async function getState(request, env, origin) {
  const visitorId = request.headers.get('x-visitor-id');
  if (visitorId && !validVisitorId(visitorId)) {
    return error('invalid_visitor', '浏览器编号无效，请刷新页面后重试。', 400, origin, env);
  }
  const achievementUpdate = await evaluateMetricAchievements(env.DB);
  const achievementState = await getAchievementSnapshot(env.DB, achievementUpdate.metrics);
  const totalWaterings = achievementUpdate.metrics.totalWaterings;
  let personalWaterings = 0;
  if (visitorId) {
    const hash = await visitorHash(visitorId);
    const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM waterings WHERE visitor_hash = ?')
      .bind(hash)
      .first();
    personalWaterings = Number(count?.count ?? 0);
  }

  const [activeVisitors, leafCount] = await Promise.all([
    getActiveVisitors(env.DB),
    getLeafCount(env.DB),
  ]);

  return json({
    totalWaterings,
    personalWaterings,
    growth: getGrowthStage(totalWaterings),
    posters: POSTERS.filter((poster) => !poster.achievementId
      || achievementState.unlockedAchievementIds.includes(poster.achievementId)),
    leafCount,
    activeVisitors,
    nextMilestone: getNextMilestone(totalWaterings),
    ...achievementState,
  }, 200, origin, env);
}

async function parseJsonBody(request, origin, env) {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return { response: error('unsupported_media_type', '请求需要使用 JSON。', 415, origin, env) };
  }
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return { response: error('body_too_large', '请求内容过长。', 413, origin, env) };
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    return { response: error('body_too_large', '请求内容过长。', 413, origin, env) };
  }
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object');
    return { value };
  } catch {
    return { response: error('invalid_json', '无法读取这次操作，请重试。', 400, origin, env) };
  }
}

async function water(request, env, origin) {
  const parsed = await parseJsonBody(request, origin, env);
  if (parsed.response) return parsed.response;
  const { value } = parsed;
  if (Object.keys(value).some((key) => key !== 'visitorId') || !validVisitorId(value.visitorId)) {
    return error('invalid_visitor', '浏览器编号无效，请刷新页面后重试。', 400, origin, env);
  }

  const hash = await visitorHash(value.visitorId);
  const now = Date.now();
  const lastWatering = await env.DB.prepare(
    'SELECT created_at FROM waterings WHERE visitor_hash = ? ORDER BY water_no DESC LIMIT 1',
  ).bind(hash).first();
  if (lastWatering && now - Number(lastWatering.created_at) < WATER_COOLDOWN_MS) {
    return error('watering_cooldown', '这滴水还在落下，稍等一会儿再浇吧。', 429, origin, env, {
      retryAfterMs: WATER_COOLDOWN_MS - (now - Number(lastWatering.created_at)),
    });
  }

  const results = await env.DB.batch([
    env.DB.prepare('UPDATE tree_stats SET total_waterings = total_waterings + 1 WHERE id = 1 RETURNING total_waterings'),
    env.DB.prepare(
      'INSERT INTO waterings (water_no, visitor_hash, created_at) SELECT total_waterings, ?, ? FROM tree_stats WHERE id = 1',
    ).bind(hash, now),
  ]);
  const totalWaterings = Number(results[0]?.results?.[0]?.total_waterings ?? 0);
  if (!totalWaterings || !results[1]?.success) {
    return error('watering_failed', '这次浇水没有记上，请再试一次。', 500, origin, env);
  }

  const comboSegments = await updateComboSegment(env.DB, hash, now);

  const personal = await env.DB.prepare('SELECT COUNT(*) AS count FROM waterings WHERE visitor_hash = ?')
    .bind(hash)
    .first();
  const [comboRow, incomingRow] = await Promise.all([
    env.DB.prepare(
      'SELECT COUNT(DISTINCT visitor_hash) AS count FROM waterings WHERE visitor_hash != ? AND created_at > ?',
    ).bind(hash, now - COMBO_WINDOW_MS).first(),
    env.DB.prepare(
      `SELECT id, water_no, poster_id, subject_id, ending_id, created_at, source, rarity
       FROM leaf_notes
       WHERE visitor_hash != ?
       ORDER BY RANDOM()
       LIMIT 1`,
    ).bind(hash).first(),
  ]);

  const achievementUpdate = await evaluateMetricAchievements(env.DB, now);
  const newlyUnlocked = [...achievementUpdate.newlyUnlocked];
  if (incomingRow?.source === 'visitor'
    && await unlockAchievement(env.DB, 'secret-carried', now)) {
    newlyUnlocked.push('secret-carried');
  }
  const achievementState = await getAchievementSnapshot(env.DB, achievementUpdate.metrics);
  const result = {
    waterNo: totalWaterings,
    totalWaterings,
    personalWaterings: Number(personal?.count ?? 0),
    growth: getGrowthStage(totalWaterings),
    nextMilestone: getNextMilestone(totalWaterings),
    incomingLeaf: incomingRow ? toLeafCard(incomingRow) : null,
    ...achievementState,
    newlyUnlocked,
  };
  const comboCount = Number(comboRow?.count ?? 0);
  if (comboCount > 0) result.combo = { count: comboCount + 1, segmentCount: comboSegments };
  return json(result, 201, origin, env);
}

async function publishLeaf(request, env, origin) {
  const parsed = await parseJsonBody(request, origin, env);
  if (parsed.response) return parsed.response;
  const { value } = parsed;
  const allowedKeys = ['visitorId', 'waterNo', 'posterId', 'subjectId', 'endingId'];
  if (Object.keys(value).some((key) => !allowedKeys.includes(key))) {
    return error('invalid_leaf', '叶笺只能使用预设的海报和短语。', 400, origin, env);
  }
  if (!validVisitorId(value.visitorId)
    || !Number.isSafeInteger(value.waterNo)
    || value.waterNo < 1
    || typeof value.posterId !== 'string'
    || !isPhraseCombinationAllowed(value.subjectId, value.endingId)) {
    return error('invalid_leaf', '请从现有海报和短语中制作叶笺。', 400, origin, env);
  }

  const poster = findPoster(value.posterId);
  if (!poster) return error('invalid_poster', '找不到这张海报。', 400, origin, env);
  const totalWaterings = await getTotalWaterings(env.DB);
  const growth = getGrowthStage(totalWaterings);
  const unlockedAchievementIds = await getUnlockedAchievementIds(env.DB);
  if (!isPosterUnlocked(poster.id, growth.level, unlockedAchievementIds)) {
    return error('poster_locked', poster.achievementId
      ? '这张海报还没有被全站点亮。'
      : '树长到更高等级后，就能使用这张海报。', 409, origin, env, {
      requiredLevel: poster.unlockLevel,
      currentLevel: growth.level,
      achievementId: poster.achievementId,
    });
  }

  const hash = await visitorHash(value.visitorId);
  const watering = await env.DB.prepare('SELECT visitor_hash FROM waterings WHERE water_no = ?')
    .bind(value.waterNo)
    .first();
  if (!watering || watering.visitor_hash !== hash) {
    return error('watering_not_owned', '这张叶笺需要绑定到你自己的浇水回执。', 403, origin, env);
  }

  const recentRarities = await env.DB.prepare(
    'SELECT rarity FROM leaf_notes WHERE visitor_hash = ? ORDER BY id DESC LIMIT ?',
  ).bind(hash, PITY_AFTER).all();
  const rarity = rollRarity(
    Math.random,
    countConsecutiveCommons((recentRarities.results ?? []).map((row) => row.rarity)),
    poster.unlockLevel ?? growth.level,
  );

  const now = Date.now();
  try {
    await env.DB.prepare(
      `INSERT INTO leaf_notes (water_no, visitor_hash, poster_id, subject_id, ending_id, created_at, source, rarity)
       VALUES (?, ?, ?, ?, ?, ?, 'visitor', ?)`,
    ).bind(value.waterNo, hash, poster.id, value.subjectId, value.endingId, now, rarity).run();
  } catch {
    return error('leaf_already_published', '这次浇水已经留过叶笺了。', 409, origin, env);
  }

  const echoedLeaf = await env.DB.prepare(
    `SELECT id FROM leaf_notes
     WHERE source = 'visitor' AND visitor_hash != ? AND subject_id = ? AND ending_id = ? AND created_at >= ?
     LIMIT 1`,
  ).bind(hash, value.subjectId, value.endingId, now - PHRASE_ECHO_WINDOW_MS).first();

  const row = await env.DB.prepare(
    'SELECT id, water_no, poster_id, subject_id, ending_id, created_at, source, rarity FROM leaf_notes WHERE water_no = ?',
  ).bind(value.waterNo).first();
  const achievementUpdate = await evaluateMetricAchievements(env.DB, now);
  const newlyUnlocked = [...achievementUpdate.newlyUnlocked];
  if (echoedLeaf && await unlockAchievement(env.DB, 'secret-echo', now)) newlyUnlocked.push('secret-echo');
  const achievementState = await getAchievementSnapshot(env.DB, achievementUpdate.metrics);
  return json({ ...toLeafCard(row), ...achievementState, newlyUnlocked }, 201, origin, env);
}

async function likeLeaf(request, env, origin) {
  const parsed = await parseJsonBody(request, origin, env);
  if (parsed.response) return parsed.response;
  const { value } = parsed;
  if (Object.keys(value).some((key) => key !== 'visitorId' && key !== 'leafId')
    || !validVisitorId(value.visitorId)
    || !Number.isSafeInteger(value.leafId)
    || value.leafId < 1) {
    return error('invalid_like', '点赞信息无效，请刷新页面后重试。', 400, origin, env);
  }
  const leaf = await env.DB.prepare('SELECT id, visitor_hash FROM leaf_notes WHERE id = ?').bind(value.leafId).first();
  if (!leaf) return error('leaf_not_found', '没有找到这张叶笺。', 404, origin, env);
  const hash = await visitorHash(value.visitorId);
  const result = await env.DB.prepare(
    'INSERT OR IGNORE INTO leaf_likes (leaf_id, visitor_hash, created_at) VALUES (?, ?, ?)',
  ).bind(value.leafId, hash, Date.now()).run();
  const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM leaf_likes WHERE leaf_id = ?')
    .bind(value.leafId).first();
  const distinctAppreciators = await env.DB.prepare(
    'SELECT COUNT(DISTINCT visitor_hash) AS count FROM leaf_likes WHERE leaf_id = ? AND visitor_hash != ?',
  ).bind(value.leafId, leaf.visitor_hash).first();
  const newlyUnlocked = [];
  if (Number(distinctAppreciators?.count ?? 0) >= 2
    && await unlockAchievement(env.DB, 'secret-loved')) {
    newlyUnlocked.push('secret-loved');
  }
  return json({
    leafId: value.leafId,
    likes: Number(count?.count ?? 0),
    isLiked: true,
    added: Number(result.meta?.changes ?? 0) > 0,
    newlyUnlocked,
  }, 200, origin, env);
}

async function heartbeat(request, env, origin) {
  const visitorId = request.headers.get('x-visitor-id');
  if (!visitorId || !validVisitorId(visitorId)) {
    return error('invalid_visitor', '浏览器编号无效，请刷新页面后重试。', 400, origin, env);
  }
  const hash = await visitorHash(visitorId);
  const now = Date.now();
  const existing = await env.DB.prepare('SELECT last_seen FROM presence WHERE visitor_hash = ?')
    .bind(hash)
    .first();
  if (!existing || now - Number(existing.last_seen) >= HEARTBEAT_MIN_INTERVAL_MS) {
    await env.DB.prepare(
      `INSERT INTO presence (visitor_hash, last_seen) VALUES (?, ?)
       ON CONFLICT(visitor_hash) DO UPDATE SET last_seen = excluded.last_seen`,
    ).bind(hash, now).run();
    await env.DB.prepare('DELETE FROM presence WHERE last_seen <= ?')
      .bind(now - PRESENCE_WINDOW_MS)
      .run();
  }
  const activeVisitors = await getActiveVisitors(env.DB, now);
  return json({ activeVisitors, unlockedAchievementIds: await getUnlockedAchievementIds(env.DB) }, 200, origin, env);
}

async function routeApi(request, env, origin, url) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: responseHeaders(origin, env) });
  if (url.pathname === '/api/health' && request.method === 'GET') {
    return json({ ok: true }, 200, origin, env);
  }
  if (url.pathname === '/api/state' && request.method === 'GET') return getState(request, env, origin);
  if (url.pathname === '/api/wall' && request.method === 'GET') return getWall(request, env, origin);
  if (url.pathname === '/api/water' && request.method === 'POST') return water(request, env, origin);
  if (url.pathname === '/api/heartbeat' && request.method === 'POST') return heartbeat(request, env, origin);
  if (url.pathname === '/api/leaves' && request.method === 'POST') return publishLeaf(request, env, origin);
  if (url.pathname === '/api/leaves/like' && request.method === 'POST') return likeLeaf(request, env, origin);
  return error('not_found', '没有找到这个接口。', 404, origin, env);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
    }

    const origin = request.headers.get('origin');
    const allowedOrigins = String(env.ALLOWED_ORIGINS ?? '').split(',').map((item) => item.trim());
    if (origin && !allowedOrigins.includes(origin)) {
      return error('origin_not_allowed', '这个页面不能操作共享发财树。', 403, null, env);
    }

    try {
      return await routeApi(request, env, origin, url);
    } catch (cause) {
      console.error('money-tree API error', cause);
      return error('internal_error', '发财树暂时没听见这次请求，请稍后重试。', 500, origin, env);
    }
  },
};
