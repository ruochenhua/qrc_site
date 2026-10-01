import { API_BASE_URL } from '../config.js';
import { addToCollection, countRarities, filterCollectionByRarity, MAX_COLLECTION_SIZE, readCollection, removeFromCollection } from './collection.js';
import { getOrCreateVisitorId } from './identity.js';
import { downloadPoster } from './download.js';
import { composePhrase, getUnlockedPosters, PHRASE_SUBJECTS, POSTERS } from '../shared/catalog.js';
import { ACHIEVEMENTS, ACHIEVEMENT_TRACKS } from '../shared/achievements.js';
import { CARD_RARITY_PRESENTATION, normalizeCardRarity } from '../shared/card-rarity.js';

const $ = (selector) => document.querySelector(selector);
const visitorId = getOrCreateVisitorId(window.localStorage);
const apiBase = API_BASE_URL.replace(/\/$/, '');
const HEARTBEAT_INTERVAL_MS = 20000;
const SOUND_PREF_KEY = 'qrc-money-tree:sound';
const ACHIEVEMENT_METRIC_UNITS = {
  totalWaterings: '滴水',
  uniqueVisitors: '位树友',
  visitorLeaves: '张叶笺',
  comboSegments: '段接力',
};
const state = {
  currentWaterNo: null,
  selectedPosterId: null,
  incomingLeaf: null,
  publishing: false,
  waterCooldownUntil: 0,
  wallLeaves: [],
  wallCount: 0,
  wallLoading: false,
  wallFeaturedCount: 0,
  collectionFilter: 'all',
  achievements: [],
  unlockedAchievementIds: new Set(),
  hiddenSecretCount: 0,
  soundEnabled: window.localStorage.getItem(SOUND_PREF_KEY) !== 'off',
};

const SCENES = {
  office: { asset: 'office-sun', location: '一间阳光办公室', caption: '窗台今天的阳光刚刚好' },
  window: { asset: 'window-garden', location: '枝叶探出窗外', caption: '把一小片绿意送到街上' },
  rooftop: { asset: 'roof-breakthrough', location: '楼顶也被树冠占领', caption: '再长高一点，就能碰到云了' },
  city: { asset: 'city-canopy', location: '发财树长成了街区', caption: '整座城市都在这片树荫里' },
  cosmic: { asset: 'cosmic-wishes', location: '发财树进入宇宙', caption: '今天的好运，已经抵达银河' },
};

function assetUrl(asset) {
  return new URL(`../${asset}`, import.meta.url).href;
}

function setAnnouncement(message, kind = '') {
  const announcement = $('#announcement');
  announcement.textContent = message;
  announcement.dataset.kind = kind;
}

function setConnection(online, message) {
  const status = $('#connection-status');
  status.classList.toggle('is-online', online);
  status.classList.toggle('is-offline', !online);
  $('#connection-label').textContent = message;
}

let audioContext = null;
let waterCooldownTimer = null;

function setWaterButtonLabel(label) {
  $('#water-button-label').textContent = label;
}

function ensureAudioContext() {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return null;
  if (!audioContext) audioContext = new Context();
  if (audioContext.state === 'suspended') void audioContext.resume();
  return audioContext;
}

function playTone(context, { start, end = start, duration, peak = 0.1, delay = 0 }) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime + delay;
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(start, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, end), now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.05);
}

function playDropletSound() {
  if (!state.soundEnabled) return;
  const context = ensureAudioContext();
  if (!context) return;
  playTone(context, { start: 640, end: 170, duration: 0.3, peak: 0.09 });
}

function playRareChime() {
  if (!state.soundEnabled) return;
  const context = ensureAudioContext();
  if (!context) return;
  playTone(context, { start: 620, end: 940, duration: 0.35, peak: 0.07 });
}

function playLegendaryChime() {
  if (!state.soundEnabled) return;
  const context = ensureAudioContext();
  if (!context) return;
  playTone(context, { start: 660, duration: 0.26, peak: 0.08 });
  playTone(context, { start: 990, duration: 0.5, peak: 0.08, delay: 0.14 });
}

function spawnWaterDrops() {
  const frame = $('#scene-frame');
  const count = 2 + Math.floor(Math.random() * 2);
  for (let index = 0; index < count; index += 1) {
    const drop = document.createElement('span');
    drop.className = 'water-drop';
    drop.style.left = `${74 + Math.random() * 10}%`;
    drop.style.top = `${42 + Math.random() * 12}%`;
    drop.style.setProperty('--dx', `${-(110 + Math.random() * 170)}px`);
    drop.style.setProperty('--dy', `${150 + Math.random() * 130}px`);
    drop.style.setProperty('--dur', `${0.7 + Math.random() * 0.35}s`);
    drop.addEventListener('animationend', () => drop.remove(), { once: true });
    frame.append(drop);
  }
  const soil = $('#soil-overlay');
  soil.classList.remove('is-soaked');
  void soil.offsetWidth;
  soil.classList.add('is-soaked');
}

function showCombo(count) {
  const combo = $('#combo-float');
  combo.textContent = `✨ 近10分钟 ${count} 位树友接力浇水！`;
  combo.classList.remove('is-visible');
  void combo.offsetWidth;
  combo.classList.add('is-visible');
}

function updatePresence(count) {
  $('#presence-line').textContent = count > 0
    ? `🌱 此刻 ${Number(count).toLocaleString('zh-CN')} 位树友在线`
    : '🌱 这棵树此刻很安静，来浇第一滴水吧';
}

function mergeAchievementState(payload = {}) {
  const before = state.unlockedAchievementIds;
  const incomingIds = Array.isArray(payload.unlockedAchievementIds)
    ? payload.unlockedAchievementIds
    : [...before];
  const unlockedIds = new Set([...before, ...incomingIds, ...(payload.newlyUnlocked ?? [])]);
  const records = new Map((payload.achievements ?? state.achievements).map((item) => [item.id, item]));
  for (const achievement of ACHIEVEMENTS) {
    if (!unlockedIds.has(achievement.id)) continue;
    const existing = records.get(achievement.id);
    records.set(achievement.id, {
      ...achievement,
      ...existing,
      artworkStatus: achievement.artworkStatus ?? existing?.artworkStatus ?? 'ready',
      unlocked: true,
      value: existing?.value ?? achievement.threshold ?? null,
      remaining: 0,
      progress: 1,
      secret: achievement.secret ?? false,
    });
  }
  if (payload.achievements) {
    for (const item of payload.achievements) records.set(item.id, item);
  }
  state.achievements = ACHIEVEMENTS
    .map((achievement) => records.get(achievement.id))
    .filter((achievement) => achievement && (!achievement.secret || unlockedIds.has(achievement.id)));
  state.unlockedAchievementIds = unlockedIds;
  state.hiddenSecretCount = Number.isFinite(payload.hiddenSecretCount)
    ? payload.hiddenSecretCount
    : ACHIEVEMENTS.filter((achievement) => achievement.secret && !unlockedIds.has(achievement.id)).length;

  const newlySeen = [...unlockedIds].filter((id) => !before.has(id));
  renderAchievements(newlySeen);
  const level = Number($('#stage-level').textContent.slice(-2)) || 1;
  renderPosterChoices(level);
  return newlySeen;
}

function renderAchievements(newlyUnlocked = []) {
  const root = $('#achievement-groups');
  if (!root) return;
  const fresh = new Set(newlyUnlocked);
  root.replaceChildren();
  const visible = new Map(state.achievements.map((achievement) => [achievement.id, achievement]));
  for (const [trackId, track] of Object.entries(ACHIEVEMENT_TRACKS)) {
    const items = ACHIEVEMENTS
      .filter((achievement) => achievement.track === trackId && (!achievement.secret || visible.has(achievement.id)))
      .map((achievement) => visible.get(achievement.id) ?? achievement);
    if (!items.length) continue;

    const section = document.createElement('section');
    section.className = 'achievement-track';
    const heading = document.createElement('div');
    heading.className = 'achievement-track-heading';
    const title = document.createElement('h3');
    title.textContent = track.title;
    const description = document.createElement('p');
    description.textContent = track.description;
    heading.append(title, description);
    const grid = document.createElement('div');
    grid.className = 'achievement-grid';

    for (const achievement of items) {
      const card = document.createElement('article');
      card.className = 'achievement-card';
      if (achievement.unlocked) card.classList.add('is-unlocked');
      if (achievement.artworkStatus === 'work-in-progress' || !achievement.posterAsset) card.classList.add('is-wip');
      if (fresh.has(achievement.id)) card.classList.add('is-new');

      const artwork = document.createElement('div');
      artwork.className = 'achievement-artwork';
      if (achievement.posterAsset) {
        const image = document.createElement('img');
        image.src = assetUrl(achievement.posterAsset);
        image.alt = `${achievement.title}成就卡面`;
        image.loading = 'lazy';
        artwork.append(image);
      } else {
        const placeholder = document.createElement('span');
        placeholder.className = 'achievement-artwork-placeholder';
        placeholder.textContent = '美术制作中';
        artwork.append(placeholder);
      }
      const stateTag = document.createElement('span');
      stateTag.className = 'achievement-state-tag';
      stateTag.textContent = achievement.unlocked ? '已点亮' : achievement.secret ? '隐藏' : '待完成';
      artwork.append(stateTag);

      const copy = document.createElement('div');
      copy.className = 'achievement-copy';
      const name = document.createElement('h4');
      name.textContent = achievement.title;
      const detail = document.createElement('p');
      detail.textContent = achievement.description;
      const progress = document.createElement('div');
      progress.className = 'achievement-progress';
      if (achievement.unlocked) {
        progress.textContent = achievement.artworkStatus === 'work-in-progress'
          ? '成就已点亮 · 卡面制作中'
          : '成就已点亮 · 全站可用';
      } else if (achievement.threshold) {
        const unit = ACHIEVEMENT_METRIC_UNITS[achievement.metric] ?? '';
        progress.textContent = `还差 ${Number(achievement.remaining ?? achievement.threshold).toLocaleString('zh-CN')} ${unit}`;
        const bar = document.createElement('span');
        bar.className = 'achievement-progress-fill';
        bar.style.width = `${Math.round(Number(achievement.progress ?? 0) * 100)}%`;
        progress.append(bar);
      } else {
        progress.textContent = '在树下等一次意外相遇';
      }
      copy.append(name, detail, progress);
      card.append(artwork, copy);
      grid.append(card);
    }
    section.append(heading, grid);
    root.append(section);
  }

  const unlockedVisible = state.achievements.filter((achievement) => achievement.unlocked).length;
  $('#achievement-count').textContent = unlockedVisible.toLocaleString('zh-CN');
  $('#menu-achievement-count').textContent = unlockedVisible.toLocaleString('zh-CN');
  const secretNote = $('#achievement-secret-note');
  secretNote.hidden = state.hiddenSecretCount <= 0;
  secretNote.textContent = state.hiddenSecretCount > 0
    ? '枝叶间还藏着一些小秘密，遇见了才会知道。'
    : '树下的秘密都已经被发现。';
}

function announceAchievementUnlocks(ids, fallbackMessage) {
  const achievements = [...new Set(ids ?? [])]
    .map((id) => ACHIEVEMENTS.find((achievement) => achievement.id === id))
    .filter(Boolean);
  const names = achievements.map((achievement) => achievement.title);
  if (!names.length) {
    setAnnouncement(fallbackMessage);
    return;
  }
  const cardMessage = achievements.every((achievement) => achievement.artworkStatus === 'work-in-progress')
    ? '对应卡面还在制作中。'
    : achievements.some((achievement) => achievement.artworkStatus === 'work-in-progress')
      ? '已完成的卡面已加入选择器，其余仍在制作中。'
      : '专属卡面已加入海报选择器。';
  setAnnouncement(`全站点亮「${names.slice(0, 2).join('」「')}」${names.length > 2 ? `等 ${names.length} 项` : ''}！${cardMessage}`);
}

function updateMilestoneLine(milestone) {
  const line = $('#milestone-line');
  if (!milestone) {
    line.dataset.complete = 'true';
    line.textContent = '浇水成就全点亮了，其他成就还在图鉴等你 ✳';
    return;
  }
  line.dataset.complete = 'false';
  $('#milestone-label').textContent = milestone.label;
  const remaining = $('#milestone-remaining');
  const next = String(milestone.remaining);
  if (remaining.textContent !== next) {
    remaining.textContent = next;
    remaining.classList.remove('is-bump');
    void remaining.offsetWidth;
    remaining.classList.add('is-bump');
  }
}

async function api(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      'x-visitor-id': visitorId,
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message ?? '这次操作没有完成，请稍后再试。');
    error.code = payload.error?.code;
    error.retryAfterMs = payload.error?.retryAfterMs;
    throw error;
  }
  return payload;
}

function updateGrowth(growth, personalWaterings = 0) {
  const count = growth.totalWaterings;
  const totalElement = $('#total-waterings');
  const totalBefore = Number(totalElement.textContent.replaceAll(',', ''));
  totalElement.textContent = count.toLocaleString('zh-CN');
  if (Number.isFinite(totalBefore) && count > totalBefore) {
    totalElement.classList.remove('is-bump');
    void totalElement.offsetWidth;
    totalElement.classList.add('is-bump');
  }
  const personalElement = $('#personal-waterings');
  const personalBefore = Number(personalElement.textContent.replaceAll(',', ''));
  personalElement.textContent = personalWaterings.toLocaleString('zh-CN');
  if (Number.isFinite(personalBefore) && personalWaterings > personalBefore) {
    personalElement.classList.remove('is-bump');
    void personalElement.offsetWidth;
    personalElement.classList.add('is-bump');
  }
  $('#stage-level').textContent = `LEVEL ${String(growth.level).padStart(2, '0')}`;
  $('#stage-name').textContent = growth.name;
  $('#stage-description').textContent = growth.description;
  const percent = Math.round(growth.progress * 100);
  $('#growth-progress').setAttribute('aria-valuenow', String(percent));
  $('#growth-progress-fill').style.width = `${percent}%`;
  $('#progress-copy').textContent = growth.nextThreshold === null
    ? '发财树已经长到银河尽头！'
    : `距离 LEVEL ${String(growth.nextLevel).padStart(2, '0')} 还有 ${Math.max(0, growth.nextThreshold - count)} 滴水`;
  $('#next-milestone').textContent = growth.nextThreshold === null ? '最高等级' : `共 ${growth.nextThreshold.toLocaleString('zh-CN')} 滴`;

  const scene = SCENES[growth.sceneId] ?? SCENES.office;
  const image = $('#world-scene');
  const nextImage = assetUrl(`assets/scenes/${scene.asset}.png`);
  if (image.src !== nextImage) {
    image.src = nextImage;
    image.alt = `${growth.name}：${growth.description}`;
  }
  $('#scene-frame').dataset.scene = growth.sceneId;
  $('#scene-location').replaceChildren(document.createTextNode('⌂ ' + scene.location));
  $('#scene-level').textContent = `${String(growth.level).padStart(2, '0')} / 10`;
  $('#scene-caption-text').textContent = scene.caption;
  renderPosterChoices(growth.level);
}

function normalizeRarity(rarity) {
  return normalizeCardRarity(rarity);
}

function makeRarityFrame(rarity) {
  const frame = document.createElement('img');
  frame.className = 'rarity-frame';
  frame.src = assetUrl(CARD_RARITY_PRESENTATION[rarity].frameAsset);
  frame.alt = '';
  frame.setAttribute('aria-hidden', 'true');
  frame.draggable = false;
  return frame;
}

function makeRarityIcon(rarity) {
  const presentation = CARD_RARITY_PRESENTATION[rarity];
  const icon = document.createElement('img');
  icon.className = 'rarity-icon';
  icon.src = assetUrl(presentation.iconAsset);
  icon.alt = '';
  icon.setAttribute('aria-hidden', 'true');
  icon.draggable = false;
  icon.style.left = `${(presentation.iconRect.x / 720) * 100}%`;
  icon.style.top = `${(presentation.iconRect.y / 900) * 100}%`;
  icon.style.width = `${(presentation.iconRect.width / 720) * 100}%`;
  icon.style.height = `${(presentation.iconRect.height / 900) * 100}%`;
  return icon;
}

function decorateRarity(article, card) {
  const rarity = normalizeRarity(card?.rarity);
  const presentation = CARD_RARITY_PRESENTATION[rarity];
  article.dataset.rarity = rarity;
  article.classList.add(`rarity-${rarity}`);
  article.append(makeRarityFrame(rarity), makeRarityIcon(rarity));
  const badge = document.createElement('span');
  badge.className = 'rarity-badge';
  badge.textContent = presentation.label;
  article.append(badge);
  return badge;
}

function makePosterCard(card, { meta = true, save = true, remove = false, label = '' } = {}) {
  const article = document.createElement('article');
  article.className = 'poster-card';
  article.dataset.testid = 'leaf-card';

  const image = document.createElement('img');
  image.src = assetUrl(card.posterAsset);
  image.alt = `${card.posterTitle}海报`;
  image.loading = 'lazy';
  article.append(image);

  if (meta) {
    const marker = document.createElement('span');
    marker.className = 'leaf-meta';
    marker.textContent = label || (card.source === 'seed' ? '树主赠礼' : `第 ${Number(card.waterNo).toLocaleString('zh-CN')} 滴水`);
    article.append(marker);
  }

  const copy = document.createElement('div');
  copy.className = 'poster-copy';
  const kicker = document.createElement('span');
  kicker.className = 'poster-kicker';
  kicker.textContent = '给路过的树友';
  const phrase = document.createElement('p');
  phrase.textContent = card.phrase;
  const signature = document.createElement('span');
  signature.className = 'poster-signature';
  signature.textContent = card.waterNo
    ? `第 ${Number(card.waterNo).toLocaleString('zh-CN')} 滴水 · 一份心意`
    : '树主赠礼 · 一份心意';
  copy.append(kicker, phrase, signature);
  article.append(copy);

  if (save) {
    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'poster-save';
    saveButton.setAttribute('aria-label', `保存${label || card.posterTitle}海报`);
    saveButton.title = '保存海报';
    saveButton.textContent = '↓';
    saveButton.addEventListener('click', () => saveCard(card));
    article.append(saveButton);
  }
  if (remove) {
    article.classList.add('poster-card--collection');
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'poster-remove';
    removeButton.setAttribute('aria-label', `从叶笺册移除「${card.posterTitle}」`);
    removeButton.title = '从叶笺册移除';
    removeButton.textContent = '−';
    removeButton.addEventListener('click', () => {
      if (!removeFromCollection(card.id)) return;
      if (state.incomingLeaf && String(state.incomingLeaf.id) === String(card.id)) {
        $('#collect-button').disabled = false;
        $('#collect-button').textContent = '收下这张叶笺';
        $('#incoming-open-collection').hidden = true;
      }
      renderCollection();
      setAnnouncement('这张叶笺已从你的册子移除。');
    });
    article.append(removeButton);
  }
  decorateRarity(article, card);
  return article;
}

async function saveCard(card) {
  try {
    await downloadPoster(card, assetUrl(card.posterAsset));
    setAnnouncement('海报已经保存到你的设备。');
  } catch {
    setAnnouncement('海报暂时保存不了，请稍后再试。', 'error');
  }
}

function renderLeafWall() {
  const wall = $('#leaf-wall');
  wall.replaceChildren();
  if (!state.wallLeaves.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-wall';
    empty.textContent = '树下还没有叶笺。先浇一滴水，给这里带来第一份祝福。';
    wall.append(empty);
  } else {
    for (const card of state.wallLeaves) wall.append(makeWallCard(card));
  }
  $('#leaf-count').textContent = state.wallCount.toLocaleString('zh-CN');
  $('#menu-leaf-count').textContent = state.wallCount.toLocaleString('zh-CN');
  $('#wall-page-status').textContent = state.wallLoading
    ? '正在寻找新的叶笺…'
    : state.wallCount === 0
      ? '还没有叶笺'
      : `${state.wallFeaturedCount} 张人气叶笺 · ${Math.max(0, state.wallLeaves.length - state.wallFeaturedCount)} 张随机来信`;
  $('#wall-refresh-button').disabled = state.wallLoading || state.wallCount === 0;
}

function makeWallCard(card) {
  const article = document.createElement('article');
  article.className = 'leaf-wall-card';
  article.dataset.testid = 'leaf-card';

  const artwork = document.createElement('div');
  artwork.className = 'leaf-wall-artwork';
  const image = document.createElement('img');
  image.src = assetUrl(card.posterAsset);
  image.alt = `${card.posterTitle}海报缩图`;
  image.loading = 'lazy';
  const copy = document.createElement('div');
  copy.className = 'leaf-wall-copy';
  const details = document.createElement('div');
  details.className = 'leaf-wall-details';
  const ordinal = document.createElement('span');
  ordinal.className = 'leaf-ordinal';
  ordinal.textContent = card.waterNo
    ? `第 ${Number(card.waterNo).toLocaleString('zh-CN')} 滴水`
    : '树主赠礼';
  const title = document.createElement('span');
  title.className = 'leaf-poster-title';
  title.textContent = card.posterTitle;
  details.append(ordinal, title);
  const rarity = normalizeRarity(card.rarity);
  article.dataset.rarity = rarity;
  article.classList.add(`rarity-${rarity}`);
  artwork.append(image, makeRarityFrame(rarity), makeRarityIcon(rarity));
  const chip = document.createElement('span');
  chip.className = `rarity-chip rarity-chip-${rarity}`;
  chip.textContent = CARD_RARITY_PRESENTATION[rarity].label;
  details.append(chip);

  const phrase = document.createElement('p');
  phrase.className = 'leaf-wall-phrase';
  phrase.textContent = card.phrase;
  const footer = document.createElement('div');
  footer.className = 'leaf-wall-footer';
  const signature = document.createElement('span');
  signature.textContent = '留给下一位树友';
  const likeButton = document.createElement('button');
  likeButton.type = 'button';
  likeButton.className = 'wall-like-button';
  likeButton.dataset.testid = 'leaf-like';
  likeButton.setAttribute('aria-pressed', String(Boolean(card.isLiked)));
  likeButton.setAttribute('aria-label', `${card.isLiked ? '已点赞' : '点赞'} · ${card.likes ?? 0}`);
  likeButton.disabled = Boolean(card.isLiked);
  likeButton.textContent = `${card.isLiked ? '♥' : '♡'} ${Number(card.likes ?? 0).toLocaleString('zh-CN')}`;
  likeButton.addEventListener('click', () => handleLike(card, likeButton));
  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'wall-save-button';
  saveButton.setAttribute('aria-label', `保存第 ${card.waterNo ?? '树主赠礼'} 张叶笺海报`);
  saveButton.title = '保存完整海报';
  saveButton.textContent = '保存海报 ↓';
  saveButton.addEventListener('click', () => saveCard(card));
  footer.append(signature, likeButton, saveButton);
  copy.append(details, phrase, footer);
  article.append(artwork, copy);
  return article;
}

function resetWall(data) {
  state.wallCount = data.leafCount;
  state.wallFeaturedCount = data.featuredCount ?? Math.min(3, data.leaves?.length ?? 0);
  state.wallLeaves = data.leaves ?? [];
  renderLeafWall();
}

async function changeWallBatch() {
  if (state.wallLoading) return;
  state.wallLoading = true;
  renderLeafWall();
  try {
    resetWall(await api('/api/wall'));
    setAnnouncement('树下换了一批叶笺，看看这次遇见谁。');
  } catch (error) {
    setAnnouncement(error.message || '暂时找不到新叶笺，请重试。', 'error');
  } finally {
    state.wallLoading = false;
    renderLeafWall();
  }
}

async function handleLike(card, button) {
  if (card.isLiked || button.disabled) return;
  button.disabled = true;
  try {
    const result = await api('/api/leaves/like', {
      method: 'POST',
      body: JSON.stringify({ visitorId, leafId: card.id }),
    });
    card.likes = result.likes;
    card.isLiked = result.isLiked;
    state.wallLeaves.sort((left, right) => Number(right.likes ?? 0) - Number(left.likes ?? 0)
      || Number(right.id) - Number(left.id));
    renderLeafWall();
    const newlySeen = mergeAchievementState({ newlyUnlocked: result.newlyUnlocked ?? [] });
    announceAchievementUnlocks(newlySeen, result.added ? '这张叶笺收到你的喜欢了。' : '你已经喜欢过这张叶笺了。');
  } catch (error) {
    button.disabled = false;
    setAnnouncement(error.message || '点赞没有记上，请重试。', 'error');
  }
}

function renderCollection() {
  const cards = readCollection();
  const visible = filterCollectionByRarity(cards, state.collectionFilter);
  const wall = $('#collection-wall');
  wall.replaceChildren();
  const counts = countRarities(cards);
  $('#collection-count').textContent = `已收集 ${counts.total} 张 · 稀有 ${counts.rare} · 传说 ${counts.legendary}`;
  $('#my-leaf-count').textContent = counts.total.toLocaleString('zh-CN');
  $('#collection-description').textContent = `只保存你主动收下的来信，最多 ${MAX_COLLECTION_SIZE} 张；可下载或移出收藏。送出的叶笺会出现在公共墙上。`;
  document.querySelectorAll('[data-rarity-filter]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.rarityFilter === state.collectionFilter));
  });
  if (!visible.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-collection';
    const message = document.createElement('p');
    message.textContent = cards.length
      ? '这个筛选下还没有叶笺。'
      : '这里收的是你主动留下的收藏。浇水收到来信后，点“收下”就会放进册子。';
    empty.append(message);
    if (!cards.length) {
      const waterShortcut = document.createElement('button');
      waterShortcut.type = 'button';
      waterShortcut.className = 'button button-primary empty-collection-water';
      waterShortcut.textContent = '去浇水收一封来信';
      waterShortcut.addEventListener('click', () => {
        $('#collection-dialog').close();
        $('#water-button').scrollIntoView({ behavior: 'smooth', block: 'center' });
        $('#water-button').focus({ preventScroll: true });
      });
      empty.append(waterShortcut);
    }
    wall.append(empty);
    return;
  }
  for (const card of visible) wall.append(makePosterCard(card, { meta: false, save: true, remove: true }));
}

function openCollection() {
  renderCollection();
  const dialog = $('#collection-dialog');
  if (!dialog.open) dialog.showModal();
}

function renderPosterChoices(level) {
  const choices = $('#poster-choices');
  const unlocked = getUnlockedPosters(level, [...state.unlockedAchievementIds]);
  choices.replaceChildren();
  for (const poster of unlocked) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'poster-choice';
    button.dataset.posterId = poster.id;
    button.setAttribute('aria-pressed', String(state.selectedPosterId === poster.id));
    const image = document.createElement('img');
    image.src = assetUrl(poster.asset);
    image.alt = '';
    image.loading = 'lazy';
    const title = document.createElement('span');
    title.textContent = poster.title;
    const unlock = document.createElement('small');
    unlock.textContent = poster.achievementId ? '全站成就卡面' : '成长海报';
    button.append(image, title, unlock);
    button.addEventListener('click', () => {
      state.selectedPosterId = poster.id;
      renderPosterChoices(level);
      updatePhrasePreview();
    });
    choices.append(button);
  }
  if (!unlocked.some((poster) => poster.id === state.selectedPosterId)) {
    state.selectedPosterId = unlocked[0]?.id ?? POSTERS[0].id;
    const current = choices.querySelector(`[data-poster-id="${state.selectedPosterId}"]`);
    current?.setAttribute('aria-pressed', 'true');
  }
  updatePhrasePreview();
}

function fillPhraseOptions() {
  const subjectSelect = $('#phrase-subject');
  subjectSelect.replaceChildren();
  for (const subject of PHRASE_SUBJECTS) {
    const option = document.createElement('option');
    option.value = subject.id;
    option.textContent = subject.label;
    subjectSelect.append(option);
  }
  subjectSelect.value = 'passerby';
  updateEndingOptions();
}

function updateEndingOptions() {
  const subject = PHRASE_SUBJECTS.find((item) => item.id === $('#phrase-subject').value) ?? PHRASE_SUBJECTS[0];
  const endingSelect = $('#phrase-ending');
  const previous = endingSelect.value;
  endingSelect.replaceChildren();
  for (const ending of subject.endings) {
    const option = document.createElement('option');
    option.value = ending.id;
    option.textContent = ending.label;
    endingSelect.append(option);
  }
  if (subject.endings.some((ending) => ending.id === previous)) endingSelect.value = previous;
  updatePhrasePreview();
}

function updatePhrasePreview() {
  const phrase = composePhrase($('#phrase-subject').value, $('#phrase-ending').value) ?? '路过的你，请记得喝口水。';
  $('#phrase-preview').textContent = phrase;
  const poster = POSTERS.find((item) => item.id === state.selectedPosterId) ?? POSTERS[0];
  $('#preview-image').src = assetUrl(poster.asset);
  $('#preview-image').alt = `${poster.title}海报预览`;
  $('#publish-button').disabled = !state.currentWaterNo || state.publishing;
}

function showIncoming(card) {
  state.incomingLeaf = card;
  $('#incoming-card-slot').replaceChildren(makePosterCard(card, { meta: true, save: false }));
  $('#incoming-letter').hidden = false;
  $('#leaf-composer').hidden = true;
  $('#collect-button').disabled = false;
  $('#collect-button').textContent = '收下这张叶笺';
  $('#incoming-open-collection').hidden = true;
  $('#publish-status').textContent = '';
  if (card?.rarity === 'legendary') playLegendaryChime();
  else if (card?.rarity === 'rare') playRareChime();
}

function startWaterCooldown(milliseconds = 3000) {
  state.waterCooldownUntil = Date.now() + Math.max(0, milliseconds);
  const button = $('#water-button');
  button.disabled = true;
  if (waterCooldownTimer) window.clearInterval(waterCooldownTimer);

  const update = () => {
    const seconds = Math.ceil((state.waterCooldownUntil - Date.now()) / 1000);
    if (seconds <= 0) {
      window.clearInterval(waterCooldownTimer);
      waterCooldownTimer = null;
      state.waterCooldownUntil = 0;
      button.disabled = false;
      setWaterButtonLabel('浇一杯水');
      return;
    }
    setWaterButtonLabel(`${seconds} 秒后再浇`);
  };

  update();
  waterCooldownTimer = window.setInterval(update, 200);
}

function showWaterReward(waterNo, leaf) {
  const reward = $('#water-reward');
  const scene = $('#scene-frame');
  const rarity = CARD_RARITY_PRESENTATION[normalizeRarity(leaf?.rarity)];
  reward.replaceChildren();
  reward.dataset.rarity = normalizeRarity(leaf?.rarity);
  const headline = document.createElement('strong');
  headline.className = 'water-reward-headline';
  headline.textContent = '+1 水滴';
  const detail = document.createElement('span');
  detail.className = 'water-reward-detail';
  detail.textContent = `第 ${Number(waterNo).toLocaleString('zh-CN')} 滴 · ${rarity.label}叶笺掉落`;
  reward.append(headline, detail);
  reward.classList.remove('is-visible');
  void reward.offsetWidth;
  reward.classList.add('is-visible');
  scene.classList.remove('is-watered');
  void scene.offsetWidth;
  scene.classList.add('is-watered');
  window.setTimeout(() => scene.classList.remove('is-watered'), 900);
}

async function loadState() {
  try {
    const [data, wall] = await Promise.all([api('/api/state'), api('/api/wall')]);
    mergeAchievementState(data);
    updateGrowth(data.growth, data.personalWaterings);
    updatePresence(data.activeVisitors);
    updateMilestoneLine(data.nextMilestone);
    resetWall(wall);
    setConnection(true, '已连上这棵树');
    $('#water-button').disabled = false;
    setAnnouncement('和远方的树友连上了，来浇第一滴水吧。');
  } catch (error) {
    setConnection(false, '暂时离线');
    setAnnouncement(error.message || '暂时连不上共享的树，请检查网络后刷新。', 'error');
  }
}

async function handleWater() {
  if ($('#water-button').disabled) return;
  const button = $('#water-button');
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  setWaterButtonLabel('水滴正在落下…');
  $('#scene-frame').classList.add('is-watering');
  spawnWaterDrops();
  playDropletSound();
  setAnnouncement('水滴正在落下…');
  try {
    const previousLevel = Number($('#stage-level').textContent.slice(-2)) || 1;
    const result = await api('/api/water', { method: 'POST', body: JSON.stringify({ visitorId }) });
    state.currentWaterNo = result.waterNo;
    state.publishing = false;
    mergeAchievementState(result);
    updateGrowth(result.growth, result.personalWaterings);
    updateMilestoneLine(result.nextMilestone);
    startWaterCooldown();
    showIncoming(result.incomingLeaf);
    showWaterReward(result.waterNo, result.incomingLeaf);
    if (result.combo && Number(result.combo.count) > 1) showCombo(Number(result.combo.count));
    setConnection(true, '树友刚刚来过');
    const rarityLabel = CARD_RARITY_PRESENTATION[normalizeRarity(result.incomingLeaf?.rarity)].label;
    announceAchievementUnlocks(result.newlyUnlocked, `第 ${result.waterNo.toLocaleString('zh-CN')} 滴水落下了，获得一张${rarityLabel}叶笺。`);
    if (result.growth.level > previousLevel) {
      $('#scene-frame').classList.add('is-level-up');
      window.setTimeout(() => $('#scene-frame').classList.remove('is-level-up'), 700);
    }
    window.setTimeout(() => $('#incoming-letter').scrollIntoView({ behavior: 'smooth', block: 'start' }), 1100);
  } catch (error) {
    button.disabled = Date.now() < state.waterCooldownUntil;
    if (error.code === 'watering_cooldown') {
      startWaterCooldown(error.retryAfterMs ?? 3000);
    } else if (!button.disabled) {
      setWaterButtonLabel('再试一次');
      window.setTimeout(() => setWaterButtonLabel('浇一杯水'), 1500);
    }
    setAnnouncement(error.message || '这次浇水没有记上，请再试一次。', 'error');
  } finally {
    button.removeAttribute('aria-busy');
    window.setTimeout(() => $('#scene-frame').classList.remove('is-watering'), 950);
  }
}

function handleCollect() {
  if (!state.incomingLeaf) return;
  const added = addToCollection(state.incomingLeaf);
  renderCollection();
  $('#collect-button').disabled = true;
  $('#collect-button').textContent = added ? '已收进叶笺册 ✓' : '这张已在叶笺册 ✓';
  $('#incoming-open-collection').hidden = false;
  setAnnouncement(added ? '叶笺已放进你的收藏册，随时可以打开查看。' : '这张叶笺已经在你的收藏册里了。');
  $('#leaf-composer').hidden = false;
  $('#leaf-composer').scrollIntoView({ behavior: 'smooth', block: 'start' });
  updatePhrasePreview();
}

async function handlePublish() {
  if (!state.currentWaterNo || state.publishing) return;
  state.publishing = true;
  $('#publish-button').disabled = true;
  $('#publish-status').textContent = '正在把这份祝福挂到树下…';
  const note = {
    visitorId,
    waterNo: state.currentWaterNo,
    posterId: state.selectedPosterId,
    subjectId: $('#phrase-subject').value,
    endingId: $('#phrase-ending').value,
  };
  try {
    const publishedLeaf = await api('/api/leaves', { method: 'POST', body: JSON.stringify(note) });
    const [fresh, wall] = await Promise.all([api('/api/state'), api('/api/wall')]);
    const newlySeen = mergeAchievementState(fresh);
    updateGrowth(fresh.growth, fresh.personalWaterings);
    updatePresence(fresh.activeVisitors);
    updateMilestoneLine(fresh.nextMilestone);
    if (!wall.leaves.some((leaf) => leaf.id === publishedLeaf.id)) {
      const discoveries = wall.leaves.slice(wall.featuredCount);
      if (discoveries.length >= 10 - wall.featuredCount) discoveries.pop();
      discoveries.push({ ...publishedLeaf, likes: 0, isLiked: false });
      wall.leaves = [...wall.leaves.slice(0, wall.featuredCount), ...discoveries]
        .sort((left, right) => Number(right.likes ?? 0) - Number(left.likes ?? 0)
          || Number(right.id) - Number(left.id));
    }
    resetWall(wall);
    $('#publish-status').textContent = '叶笺已经挂到树下了，下一位路过的人会收到它。';
    announceAchievementUnlocks([...newlySeen, ...(publishedLeaf.newlyUnlocked ?? [])], '你把一份祝福留给了下一位树友。');
    setConnection(true, '叶笺已经送出');
    state.publishing = false;
    updatePhrasePreview();
  } catch (error) {
    $('#publish-status').textContent = error.message || '叶笺没有挂上，请再试一次。';
    $('#publish-status').dataset.kind = 'error';
    state.publishing = false;
    updatePhrasePreview();
  }
}

function bindControls() {
  fillPhraseOptions();
  $('#water-button').addEventListener('click', handleWater);
  $('#collect-button').addEventListener('click', handleCollect);
  $('#collection-open').addEventListener('click', openCollection);
  $('#incoming-open-collection').addEventListener('click', openCollection);
  $('#collection-close').addEventListener('click', () => $('#collection-dialog').close());
  $('#collection-dialog').addEventListener('click', (event) => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  });
  $('#phrase-subject').addEventListener('change', updateEndingOptions);
  $('#phrase-ending').addEventListener('change', updatePhrasePreview);
  $('#publish-button').addEventListener('click', handlePublish);
  $('#wall-refresh-button').addEventListener('click', changeWallBatch);
  $('#save-incoming-button').addEventListener('click', () => state.incomingLeaf && saveCard(state.incomingLeaf));
  $('#save-preview-button').addEventListener('click', async () => {
    const poster = POSTERS.find((item) => item.id === state.selectedPosterId) ?? POSTERS[0];
    await saveCard({
      id: `preview-${state.currentWaterNo ?? 'sample'}`,
      waterNo: state.currentWaterNo,
      posterTitle: poster.title,
      posterAsset: poster.asset,
      rarity: null,
      phrase: composePhrase($('#phrase-subject').value, $('#phrase-ending').value),
    });
  });
  document.querySelectorAll('[data-rarity-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      state.collectionFilter = button.dataset.rarityFilter;
      renderCollection();
    });
  });
  const soundToggle = $('#sound-toggle');
  const renderSoundToggle = () => {
    soundToggle.setAttribute('aria-pressed', String(state.soundEnabled));
    soundToggle.textContent = state.soundEnabled ? '🔊' : '🔇';
  };
  renderSoundToggle();
  soundToggle.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    window.localStorage.setItem(SOUND_PREF_KEY, state.soundEnabled ? 'on' : 'off');
    renderSoundToggle();
    if (state.soundEnabled) playDropletSound();
  });
  $('#milestone-remaining').addEventListener('animationend', (event) => {
    if (event.animationName === 'milestone-bump') event.currentTarget.classList.remove('is-bump');
  });
  $('#combo-float').addEventListener('animationend', (event) => {
    if (event.animationName === 'combo-rise') event.currentTarget.classList.remove('is-visible');
  });
  $('#water-reward').addEventListener('animationend', (event) => {
    if (event.animationName === 'water-reward-pop') event.currentTarget.classList.remove('is-visible');
  });
}

async function sendHeartbeat() {
  try {
    const response = await fetch(`${apiBase}/api/heartbeat`, {
      method: 'POST',
      headers: { 'x-visitor-id': visitorId },
    });
    if (!response.ok) return;
    const result = await response.json();
    updatePresence(result.activeVisitors);
    const newlySeen = mergeAchievementState(result);
    if (newlySeen.length) announceAchievementUnlocks(newlySeen, '');
  } catch {
  }
}

function startHeartbeat() {
  const initialHeartbeat = sendHeartbeat();
  window.setInterval(() => {
    if (!document.hidden) sendHeartbeat();
  }, HEARTBEAT_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) sendHeartbeat();
  });
  return initialHeartbeat;
}

bindControls();
renderCollection();
startHeartbeat().then(loadState);
