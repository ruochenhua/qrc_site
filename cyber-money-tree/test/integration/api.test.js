import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { env, exports } from 'cloudflare:workers';

const worker = exports.default;
const validVisitor = '11111111-1111-4111-8111-111111111111';

function visitorHash(visitorId) {
  return createHash('sha256').update(visitorId.toLowerCase()).digest('hex');
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  return worker.fetch(
    new Request(`https://tree.test${path}`, {
      method,
      headers: body ? { 'content-type': 'application/json', ...headers } : headers,
      body: body ? JSON.stringify(body) : undefined,
    }),
    env,
    { waitUntil() {} },
  );
}

async function json(response) {
  return response.json();
}

async function insertTestLeaves(count) {
  await env.DB.batch(Array.from({ length: count }, (_, index) => env.DB.prepare(
    `INSERT INTO leaf_notes (visitor_hash, poster_id, subject_id, ending_id, created_at, source)
     VALUES (?, 'office-sun', 'passerby', 'drink-water', ?, 'visitor')`,
  ).bind(`wall-test-${index}`, 1791000000 + index)));
  const result = await env.DB.prepare(
    "SELECT id FROM leaf_notes WHERE visitor_hash LIKE 'wall-test-%' ORDER BY id DESC LIMIT ?",
  ).bind(count).all();
  return (result.results ?? []).map((row) => row.id);
}

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM leaf_likes'),
    env.DB.prepare("DELETE FROM leaf_notes WHERE source = 'visitor'"),
    env.DB.prepare('DELETE FROM waterings'),
    env.DB.prepare('DELETE FROM presence'),
    env.DB.prepare('DELETE FROM community_achievements'),
    env.DB.prepare('DELETE FROM combo_state'),
    env.DB.prepare('UPDATE tree_stats SET total_waterings = 0 WHERE id = 1'),
  ]);
});

describe('Worker + D1 shared-tree API', () => {
  it('returns a seeded tree state and a non-empty public leaf wall', async () => {
    const response = await request('/api/state');
    const state = await json(response);

    expect(response.status).toBe(200);
    expect(state).toMatchObject({ totalWaterings: 0, leafCount: 6, growth: { level: 1 } });
    expect(state).toMatchObject({ activeVisitors: 0, nextMilestone: { threshold: 42, remaining: 42 } });
    expect(state.recentLeaves).toBeUndefined();
  });

  it('shows the three most-liked leaves and samples a different ten-card wall', async () => {
    const ids = await insertTestLeaves(12);
    const topLeafId = ids.at(-1);
    const secondLeafId = ids.at(-2);
    for (const visitorId of [validVisitor, '22222222-2222-4222-8222-222222222222']) {
      expect((await request('/api/leaves/like', {
        method: 'POST',
        body: { visitorId, leafId: topLeafId },
      })).status).toBe(200);
    }
    expect((await request('/api/leaves/like', {
      method: 'POST',
      body: { visitorId: validVisitor, leafId: secondLeafId },
    })).status).toBe(200);

    const first = await json(await request('/api/wall', { headers: { 'x-visitor-id': validVisitor } }));
    const second = await json(await request('/api/wall', { headers: { 'x-visitor-id': validVisitor } }));
    expect(first.leafCount).toBe(18);
    expect(first.leaves).toHaveLength(10);
    expect(new Set(first.leaves.map((leaf) => leaf.id)).size).toBe(10);
    expect(first.leaves[0]).toMatchObject({ id: topLeafId, likes: 2, isLiked: true });
    expect(first.leaves[1]).toMatchObject({ id: secondLeafId, likes: 1, isLiked: true });
    expect(first.leaves.map((leaf) => leaf.likes)).toEqual(
      [...first.leaves.map((leaf) => leaf.likes)].sort((left, right) => right - left),
    );
    expect(second.leaves.map((leaf) => leaf.id)).not.toEqual(first.leaves.map((leaf) => leaf.id));
  });

  it('records one like per browser and returns the unchanged count for repeats', async () => {
    const [leafId] = await insertTestLeaves(1);
    const body = { visitorId: validVisitor, leafId };
    const first = await json(await request('/api/leaves/like', { method: 'POST', body }));
    const repeat = await json(await request('/api/leaves/like', { method: 'POST', body }));
    const other = await json(await request('/api/leaves/like', {
      method: 'POST',
      body: { visitorId: '22222222-2222-4222-8222-222222222222', leafId },
    }));

    expect(first).toMatchObject({ leafId, likes: 1, isLiked: true, added: true });
    expect(repeat).toMatchObject({ leafId, likes: 1, isLiked: true, added: false });
    expect(other).toMatchObject({ leafId, likes: 2, isLiked: true, added: true });
  });

  it('rejects invalid likes and unknown leaf ids', async () => {
    expect((await request('/api/leaves/like', {
      method: 'POST',
      body: { visitorId: 'bad', leafId: 1 },
    })).status).toBe(400);
    expect((await request('/api/leaves/like', {
      method: 'POST',
      body: { visitorId: validVisitor, leafId: 0 },
    })).status).toBe(400);
    expect((await request('/api/leaves/like', {
      method: 'POST',
      body: { visitorId: validVisitor, leafId: 999999 },
    })).status).toBe(404);
  });

  it('assigns a shared ordinal, increments this device count and delivers someone else\'s leaf', async () => {
    const response = await request('/api/water', { method: 'POST', body: { visitorId: validVisitor } });
    const result = await json(response);

    expect(response.status).toBe(201);
    expect(result).toMatchObject({ waterNo: 1, totalWaterings: 1, personalWaterings: 1 });
    expect(result.incomingLeaf).toMatchObject({ source: 'seed' });
  });

  it('publishes only reviewed poster and phrase combinations to the shared wall', async () => {
    const water = await json(await request('/api/water', { method: 'POST', body: { visitorId: validVisitor } }));
    const response = await request('/api/leaves', {
      method: 'POST',
      body: {
        visitorId: validVisitor,
        waterNo: water.waterNo,
        posterId: 'office-sun',
        subjectId: 'worker',
        endingId: 'clock-out',
      },
    });
    const leaf = await json(response);

    expect(response.status).toBe(201);
    expect(leaf.phrase).toBe('今天的打工人，也值得早点下班。');
    const wall = await json(await request('/api/wall'));
    expect(wall.leaves.some((item) => item.id === leaf.id && item.rarity === leaf.rarity)).toBe(true);
  });

  it('rejects free text and combinations that are not in the phrase catalog', async () => {
    const water = await json(await request('/api/water', { method: 'POST', body: { visitorId: validVisitor } }));
    const response = await request('/api/leaves', {
      method: 'POST',
      body: {
        visitorId: validVisitor,
        waterNo: water.waterNo,
        posterId: 'office-sun',
        subjectId: 'passerby',
        endingId: 'clock-out',
        text: 'arbitrary message',
      },
    });
    expect(response.status).toBe(400);
  });

  it('does not allow a different browser to publish on someone else\'s watering', async () => {
    const water = await json(await request('/api/water', { method: 'POST', body: { visitorId: validVisitor } }));
    const response = await request('/api/leaves', {
      method: 'POST',
      body: {
        visitorId: '22222222-2222-4222-8222-222222222222',
        waterNo: water.waterNo,
        posterId: 'office-sun',
        subjectId: 'worker',
        endingId: 'clock-out',
      },
    });
    expect(response.status).toBe(403);
  });

  it('rejects posters before their shared-tree level unlocks', async () => {
    const water = await json(await request('/api/water', { method: 'POST', body: { visitorId: validVisitor } }));
    const response = await request('/api/leaves', {
      method: 'POST',
      body: {
        visitorId: validVisitor,
        waterNo: water.waterNo,
        posterId: 'window-garden',
        subjectId: 'worker',
        endingId: 'clock-out',
      },
    });
    expect(response.status).toBe(409);
  });

  it('enforces at most one published leaf for each watering', async () => {
    const water = await json(await request('/api/water', { method: 'POST', body: { visitorId: validVisitor } }));
    const body = {
      visitorId: validVisitor,
      waterNo: water.waterNo,
      posterId: 'office-sun',
      subjectId: 'worker',
      endingId: 'clock-out',
    };
    expect((await request('/api/leaves', { method: 'POST', body })).status).toBe(201);
    expect((await request('/api/leaves', { method: 'POST', body })).status).toBe(409);
  });

  it('assigns distinct shared ordinals to simultaneous watering requests', async () => {
    const responses = await Promise.all([
      request('/api/water', { method: 'POST', body: { visitorId: validVisitor } }),
      request('/api/water', { method: 'POST', body: { visitorId: '33333333-3333-4333-8333-333333333333' } }),
    ]);
    const results = await Promise.all(responses.map(json));
    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    expect(results.map((result) => result.waterNo).sort((a, b) => a - b)).toEqual([1, 2]);
    expect(results.every((result) => result.totalWaterings >= 1)).toBe(true);
  });

  it('rejects malformed browser ids without changing the shared total', async () => {
    const response = await request('/api/water', { method: 'POST', body: { visitorId: 'not-a-uuid' } });
    expect(response.status).toBe(400);
    expect((await json(await request('/api/state'))).totalWaterings).toBe(0);
  });

  it('enforces the watering cooldown for repeated actions from one browser', async () => {
    const first = await request('/api/water', { method: 'POST', body: { visitorId: validVisitor } });
    const second = await request('/api/water', { method: 'POST', body: { visitorId: validVisitor } });
    expect(first.status).toBe(201);
    expect(second.status).toBe(429);
  });

  it('returns a rarity on every published leaf', async () => {
    const water = await json(await request('/api/water', { method: 'POST', body: { visitorId: validVisitor } }));
    const response = await request('/api/leaves', {
      method: 'POST',
      body: {
        visitorId: validVisitor,
        waterNo: water.waterNo,
        posterId: 'office-sun',
        subjectId: 'worker',
        endingId: 'clock-out',
      },
    });
    const leaf = await json(response);

    expect(response.status).toBe(201);
    expect(['common', 'rare', 'legendary']).toContain(leaf.rarity);
  });

  it('guarantees a rare-or-better leaf after ten consecutive commons from one visitor', async () => {
    const hash = visitorHash(validVisitor);
    await env.DB.batch(Array.from({ length: 10 }, (_, index) => env.DB.prepare(
      `INSERT INTO leaf_notes (visitor_hash, poster_id, subject_id, ending_id, created_at, source, rarity)
       VALUES (?, 'office-sun', 'passerby', 'drink-water', ?, 'visitor', 'common')`,
    ).bind(hash, 1792000000 + index)));

    const water = await json(await request('/api/water', { method: 'POST', body: { visitorId: validVisitor } }));
    const leaf = await json(await request('/api/leaves', {
      method: 'POST',
      body: {
        visitorId: validVisitor,
        waterNo: water.waterNo,
        posterId: 'office-sun',
        subjectId: 'worker',
        endingId: 'clock-out',
      },
    }));

    expect(['rare', 'legendary']).toContain(leaf.rarity);
  });

  it('flags a relay when another visitor watered within the ten minute window', async () => {
    const first = await json(await request('/api/water', { method: 'POST', body: { visitorId: validVisitor } }));
    expect(first.combo).toBeUndefined();

    await env.DB.prepare(
      'INSERT INTO waterings (water_no, visitor_hash, created_at) VALUES (0, ?, ?) ',
    ).bind(visitorHash(validVisitor), Date.now() - 500).run();

    const second = await json(await request('/api/water', {
      method: 'POST',
      body: { visitorId: '22222222-2222-4222-8222-222222222222' },
    }));
    expect(second).toMatchObject({ combo: { count: 2 } });
  });

  it('tracks active visitors from heartbeats and skips writes inside thirty seconds', async () => {
    expect((await request('/api/heartbeat', { method: 'POST' })).status).toBe(400);
    await env.DB.prepare('INSERT INTO presence (visitor_hash, last_seen) VALUES (?, ?)')
      .bind(visitorHash('33333333-3333-4333-8333-333333333333'), Date.now() - 120000)
      .run();

    const first = await request('/api/heartbeat', { method: 'POST', headers: { 'x-visitor-id': validVisitor } });
    expect(first.status).toBe(200);
    expect(await json(first)).toMatchObject({ activeVisitors: 1, unlockedAchievementIds: [] });
    expect(await env.DB.prepare('SELECT COUNT(*) AS count FROM presence WHERE last_seen <= ?')
      .bind(Date.now() - 60000).first()).toMatchObject({ count: 0 });
    let state = await json(await request('/api/state'));
    expect(state.activeVisitors).toBe(1);

    const seen = await env.DB.prepare('SELECT last_seen FROM presence').first();
    const repeat = await request('/api/heartbeat', { method: 'POST', headers: { 'x-visitor-id': validVisitor } });
    expect(repeat.status).toBe(200);
    expect(await json(repeat)).toMatchObject({ activeVisitors: 1, unlockedAchievementIds: [] });
    const unchanged = await env.DB.prepare('SELECT last_seen FROM presence').first();
    expect(Number(unchanged.last_seen)).toBe(Number(seen.last_seen));

    const second = await request('/api/heartbeat', {
      method: 'POST',
      headers: { 'x-visitor-id': '22222222-2222-4222-8222-222222222222' },
    });
    expect(await json(second)).toMatchObject({ activeVisitors: 2, unlockedAchievementIds: [] });
    state = await json(await request('/api/state'));
    expect(state.activeVisitors).toBe(2);
  });

  it('reports the next milestone against the shared watering total', async () => {
    let state = await json(await request('/api/state'));
    expect(state.nextMilestone).toEqual({ threshold: 42, label: '小树开张', remaining: 42 });

    const water = await json(await request('/api/water', { method: 'POST', body: { visitorId: validVisitor } }));
    expect(water.nextMilestone).toMatchObject({ threshold: 42, remaining: 41 });
    state = await json(await request('/api/state'));
    expect(state.nextMilestone).toMatchObject({ threshold: 42, remaining: 41 });
  });

  it('allows the configured site and rejects untrusted origins', async () => {
    const allowed = await request('/api/state', { headers: { origin: 'https://www.qrc-eye.com' } });
    const rejected = await request('/api/state', { headers: { origin: 'https://untrusted.example' } });
    expect(allowed.headers.get('access-control-allow-origin')).toBe('https://www.qrc-eye.com');
    expect(rejected.status).toBe(403);
  });
});
