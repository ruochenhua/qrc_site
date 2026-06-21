import {
  RANK_ORDER,
  RANKS,
  EVENTS,
  RECIPES,
  COMPONENTS,
  COMPONENT_CATEGORIES,
  COMBO_RULES,
  DISPLAY_LABELS,
  MAX_THRUST,
  MAX_DURATION_VALUE,
} from './config.js';

/**
 * @typedef {import('./config.js').Event} Event
 * @typedef {import('./config.js').Recipe} Recipe
 */

/**
 * @typedef {Object} Shell
 * @property {string} id
 * @property {string|null} name
 * @property {string} shape
 * @property {number} height
 * @property {number} scale
 * @property {number} density
 * @property {number} duration
 * @property {Object} color
 * @property {Object} effects
 * @property {number} cost
 * @property {Object} components
 * @property {string|null} recipeId
 * @property {string|null} blueprintId
 * @property {boolean} hasSecondary
 * @property {Object} secondary
 * @property {Object|null} secondaryAttr
 */

/**
 * @typedef {Object} ScoreResult
 * @property {number} score
 * @property {number} baseScore
 * @property {number} complexityBonus
 * @property {number} comboBonus
 * @property {number} repeatPenalty
 * @property {string[]} combos
 * @property {{hits: number, total: number}} preferenceHits
 */

/**
 * @typedef {Object} SettlementResult
 * @property {boolean} success
 * @property {ScoreResult} [score]
 * @property {Object} [rewards]
 * @property {number} [cost]
 * @property {boolean} [isFirstClear]
 * @property {boolean} [rankedUp]
 * @property {string} [reason]
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {string} [reason]
 * @property {number} [cost]
 */

export function getRankIndex(rankId) {
  return RANK_ORDER.indexOf(rankId);
}

export function getEventById(eventId) {
  return EVENTS[eventId] || null;
}

export function getEventPreferenceHint(eventId) {
  const event = getEventById(eventId);
  if (!event) return '';
  return event.preferenceDesc || event.desc || '';
}

export function getComponentById(category, id) {
  return COMPONENTS[category]?.[id] || null;
}

export function displayLabel(category, value) {
  return DISPLAY_LABELS[category]?.[value] || value;
}

export function findComponentById(componentId) {
  for (const category of COMPONENT_CATEGORIES) {
    const comp = COMPONENTS[category][componentId];
    if (comp) return comp;
  }
  return null;
}

export function isComponentUnlocked(state, componentId) {
  const comp = findComponentById(componentId);
  if (!comp) return false;
  return state.fame >= comp.unlockFame;
}

export function isComponentOwned(state, componentId) {
  return state.ownedComponents.has(componentId);
}

export function getUnlockedComponents(state) {
  const result = {};
  for (const category of COMPONENT_CATEGORIES) {
    result[category] = {};
    for (const [id, comp] of Object.entries(COMPONENTS[category])) {
      if (state.fame >= comp.unlockFame) {
        result[category][id] = comp;
      }
    }
  }
  return result;
}

export function getOwnedComponents(state) {
  const result = {};
  for (const category of COMPONENT_CATEGORIES) {
    result[category] = {};
    for (const [id, comp] of Object.entries(COMPONENTS[category])) {
      if (state.ownedComponents.has(id)) {
        result[category][id] = comp;
      }
    }
  }
  return result;
}

function isQuantityMapAccessible(map, category, state) {
  for (const [id, qty] of Object.entries(map || {})) {
    if (!qty) continue;
    const comp = getComponentById(category, id);
    if (!comp || !state.ownedComponents.has(id)) return false;
  }
  return true;
}

export function areComponentsAccessible(components, state) {
  for (const category of COMPONENT_CATEGORIES) {
    const selected = components[category];
    if (category === 'gunpowder' || category === 'colorant' || category === 'effect') {
      if (!isQuantityMapAccessible(selected, category, state)) return false;
    } else if (category === 'casing' || category === 'fuse') {
      if (!selected) return false;
      const comp = getComponentById(category, selected);
      if (!comp || !state.ownedComponents.has(selected)) return false;
    }
  }
  const secondary = components.secondary || {};
  if (!isQuantityMapAccessible(secondary.colorant, 'colorant', state)) return false;
  if (!isQuantityMapAccessible(secondary.effect, 'effect', state)) return false;
  return true;
}

export function getRecipeById(recipeId) {
  const recipe = RECIPES[recipeId];
  if (!recipe) return null;
  const shell = assembleShell(recipe.components, recipe);
  // Merge recipe metadata (unlockFame, researchCost, desc) into the assembled shell.
  return { ...shell, unlockFame: recipe.unlockFame, researchCost: recipe.researchCost, desc: recipe.desc };
}

export function loadRecipe(recipeId) {
  const recipe = RECIPES[recipeId];
  return recipe ? { ...recipe.components } : null;
}

function quantityMapsEqual(a, b) {
  const mapA = a || {};
  const mapB = b || {};
  const keys = new Set([...Object.keys(mapA), ...Object.keys(mapB)]);
  for (const key of keys) {
    if ((mapA[key] || 0) !== (mapB[key] || 0)) return false;
  }
  return true;
}

function assembliesEqual(a, b) {
  if (!a || !b) return false;
  if (a.casing !== b.casing) return false;
  if (a.fuse !== b.fuse) return false;
  if (!quantityMapsEqual(a.gunpowder, b.gunpowder)) return false;
  if (!quantityMapsEqual(a.colorant, b.colorant)) return false;
  if (!quantityMapsEqual(a.effect, b.effect)) return false;
  const secA = a.secondary || {};
  const secB = b.secondary || {};
  if (!quantityMapsEqual(secA.colorant, secB.colorant)) return false;
  if (!quantityMapsEqual(secA.effect, secB.effect)) return false;
  return true;
}

export function isExactRecipeMatch(assembly, recipeId) {
  const recipe = RECIPES[recipeId];
  if (!recipe || !assembly) return false;
  return assembliesEqual(assembly, recipe.components);
}

/**
 * Validate an assembly definition before building a shell.
 * @param {Object} components
 * @returns {ValidationResult}
 */
export function validateShellComponents(components) {
  for (const category of COMPONENT_CATEGORIES) {
    if (components[category] === undefined) {
      return { valid: false, reason: 'missing_category' };
    }
  }

  const casing = getComponentById('casing', components.casing);
  if (!casing) return { valid: false, reason: 'invalid_casing' };

  // Validate all referenced component IDs exist.
  for (const category of ['gunpowder', 'colorant', 'effect']) {
    const selected = components[category] || {};
    for (const id of Object.keys(selected)) {
      if (!getComponentById(category, id)) {
        return { valid: false, reason: 'invalid_component' };
      }
    }
  }
  if (!getComponentById('fuse', components.fuse)) {
    return { valid: false, reason: 'invalid_fuse' };
  }

  const primaryUsage =
    sumQuantities(components.gunpowder) +
    sumQuantities(components.colorant) +
    sumQuantities(components.effect);

  if (primaryUsage > casing.capacity) {
    return { valid: false, reason: 'over_capacity' };
  }

  const secondary = components.secondary || {};
  const secondaryUsage =
    sumQuantities(secondary.gunpowder) +
    sumQuantities(secondary.colorant) +
    sumQuantities(secondary.effect);
  const hasSecondary = secondaryUsage > 0 || sumQuantities(components.effect, 'e006') > 0;
  if (hasSecondary) {
    if (casing.layers < 2) {
      return { valid: false, reason: 'needs_multi_layer_casing' };
    }
    if (sumQuantities(secondary.gunpowder) > 0) {
      return { valid: false, reason: 'gunpowder_in_secondary' };
    }
    const secondaryLayerUsage = sumQuantities(secondary.colorant) + sumQuantities(secondary.effect);
    if (secondaryLayerUsage > casing.secondaryCapacity) {
      return { valid: false, reason: 'over_secondary_capacity' };
    }
  }

  return { valid: true };
}

function sumQuantities(map, idFilter = null) {
  if (!map) return 0;
  if (idFilter) return map[idFilter] || 0;
  return Object.values(map).reduce((sum, n) => sum + (Number(n) || 0), 0);
}

/**
 * Build a Shell from a quantity-based component definition.
 * @param {Object} components
 * @param {Recipe|null} [recipe]
 * @returns {Shell}
 */
export function assembleShell(components, recipe = null) {
  const validation = validateShellComponents(components);
  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  const casing = getComponentById('casing', components.casing);
  const fuse = getComponentById('fuse', components.fuse);

  let cost = casing.cost + fuse.cost;
  cost += sumCost(components.gunpowder, 'gunpowder');
  cost += sumCost(components.colorant, 'colorant');
  cost += sumCost(components.effect, 'effect');

  const secondary = components.secondary || {};
  cost += sumCost(secondary.colorant, 'colorant');
  cost += sumCost(secondary.effect, 'effect');

  const hasSecondary = casing.layers >= 2 && (
    sumQuantities(secondary.effect, 'e006') > 0 ||
    sumQuantities(secondary.colorant) > 0 ||
    sumQuantities(secondary.effect) > 0
  );

  const thrust = totalThrust(components.gunpowder);
  const totalColorant = sumQuantities(components.colorant);
  const totalEffect = sumQuantities(components.effect);

  const height = normalize((thrust / MAX_THRUST) * fuse.heightFactor, 1);
  const scale = normalize((thrust / MAX_THRUST) * casing.scaleMultiplier, 1);
  const density = normalize(totalColorant, casing.capacity);
  const duration = normalize(thrust * 0.6 + totalEffect * 0.4, MAX_DURATION_VALUE);
  const color = computeColorVector(components.colorant);
  const effects = computeEffectsVector(components.effect);

  let secondaryAttr = null;
  if (hasSecondary) {
    const secColorant = sumQuantities(secondary.colorant);
    const secScale = scale * 0.6;
    secondaryAttr = {
      scale: secScale,
      density: normalize(secColorant, casing.secondaryCapacity),
      delay: fuseDelay(components.fuse),
      color: computeColorVector(secondary.colorant),
      effects: computeEffectsVector(secondary.effect),
    };
  }

  return {
    id: recipe ? recipe.id : `shell_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    name: recipe ? recipe.name : null,
    shape: casing.shape,
    height,
    scale,
    density,
    duration,
    color,
    effects,
    cost,
    components: JSON.parse(JSON.stringify(components)),
    recipeId: recipe ? recipe.id : null,
    blueprintId: null,
    hasSecondary,
    secondary,
    secondaryAttr,
  };
}

function sumCost(map, category) {
  if (!map) return 0;
  let total = 0;
  for (const [id, qty] of Object.entries(map)) {
    const comp = getComponentById(category, id);
    if (comp) total += comp.cost * qty;
  }
  return total;
}

function totalThrust(gunpowderMap) {
  if (!gunpowderMap) return 0;
  let total = 0;
  for (const [id, qty] of Object.entries(gunpowderMap)) {
    const comp = getComponentById('gunpowder', id);
    if (comp) total += comp.thrust * qty;
  }
  return total;
}

function computeColorVector(colorantMap) {
  const vector = {};
  const total = sumQuantities(colorantMap);
  if (total === 0) return vector;
  for (const [id, qty] of Object.entries(colorantMap)) {
    const comp = getComponentById('colorant', id);
    if (comp) {
      vector[comp.color] = (vector[comp.color] || 0) + qty / total;
    }
  }
  return vector;
}

function computeEffectsVector(effectMap) {
  const vector = {};
  if (!effectMap) return vector;
  for (const [id, qty] of Object.entries(effectMap)) {
    const comp = getComponentById('effect', id);
    if (!comp) continue;
    if (qty >= comp.threshold) {
      vector[comp.effect] = (qty - comp.threshold + 1) * comp.intensity;
    }
  }
  return vector;
}

function fuseDelay(fuseId) {
  const fuse = getComponentById('fuse', fuseId);
  if (!fuse) return 0.5;
  const map = { short: 0.3, medium: 0.5, long: 0.7, ultra: 0.9 };
  return map[fuse.length] || 0.5;
}

function normalize(value, max) {
  return Math.max(0, Math.min(1, value / max));
}

/**
 * @param {import('./state.js').GameState} state
 * @returns {Event[]}
 */
export function getAvailableEvents(state) {
  return Object.values(EVENTS).filter(event => isEventAvailable(state, event.id));
}

/**
 * @param {import('./state.js').GameState} state
 * @param {string} eventId
 * @returns {boolean}
 */
export function isEventAvailable(state, eventId) {
  return getEventStatus(state, eventId) === 'available';
}

/**
 * @param {import('./state.js').GameState} state
 * @param {string} eventId
 * @returns {'completed'|'available'|'locked'}
 */
export function getEventStatus(state, eventId) {
  const event = getEventById(eventId);
  if (!event) return 'locked';

  const currentIndex = getRankIndex(state.rank);
  const eventRankIndex = getRankIndex(event.rank);
  if (eventRankIndex > currentIndex) return 'locked';

  if (event.isMain && state.isMainEventCompleted(event.id)) return 'completed';

  if (event.isMain) {
    const previousMainIds = getMainEventIdsUpToRank(state.rank);
    for (const id of previousMainIds) {
      if (id === event.id) break;
      if (!state.isMainEventCompleted(id)) return 'locked';
    }
  }

  return 'available';
}

/**
 * @param {import('./state.js').GameState} state
 * @param {string} eventId
 * @returns {string}
 */
export function getEventLockReason(state, eventId) {
  const event = getEventById(eventId);
  if (!event) return '赛事不存在';

  const currentIndex = getRankIndex(state.rank);
  const eventRankIndex = getRankIndex(event.rank);
  if (eventRankIndex > currentIndex) {
    return `需要等级：${RANKS[event.rank].name}`;
  }

  if (event.isMain) {
    const previousMainIds = getMainEventIdsUpToRank(state.rank);
    for (const id of previousMainIds) {
      if (id === event.id) break;
      if (!state.isMainEventCompleted(id)) {
        const prev = getEventById(id);
        return prev ? `需先完成：${prev.name}` : '需先完成前置主线赛事';
      }
    }
  }

  return '暂不可用';
}

export function getMainEventIdsUpToRank(rankId) {
  const index = getRankIndex(rankId);
  const ids = [];
  for (let i = 0; i <= index; i++) {
    const rank = RANK_ORDER[i];
    for (const event of Object.values(EVENTS)) {
      if (event.rank === rank && event.isMain) {
        ids.push(event.id);
      }
    }
  }
  return ids;
}

export function getCurrentRankMainEvents(state) {
  return Object.values(EVENTS).filter(e => e.rank === state.rank && e.isMain);
}

/**
 * @param {import('./state.js').GameState} state
 * @returns {boolean}
 */
export function canRankUp(state) {
  const rankInfo = RANKS[state.rank];
  if (!rankInfo || rankInfo.nextThreshold === null) return false;
  if (state.fame < rankInfo.nextThreshold) return false;

  const mainEvents = getCurrentRankMainEvents(state);
  for (const event of mainEvents) {
    if (!state.isMainEventCompleted(event.id)) return false;
  }
  return true;
}

/**
 * @param {import('./state.js').GameState} state
 * @returns {boolean}
 */
export function rankUp(state) {
  if (!canRankUp(state)) return false;
  const currentIndex = getRankIndex(state.rank);
  if (currentIndex >= RANK_ORDER.length - 1) return false;
  state.rank = RANK_ORDER[currentIndex + 1];
  updateUnlocks(state);
  if (state.rank === 'master') {
    state.win();
  }
  return true;
}

/**
 * @param {import('./state.js').GameState} state
 * @returns {void}
 */
export function updateUnlocks(state) {
  for (const recipe of Object.values(RECIPES)) {
    if (state.fame >= recipe.unlockFame) {
      state.unlockRecipe(recipe.id);
    }
  }
}

export function getUnlockedRecipes(state) {
  return Object.values(RECIPES).filter(r => state.unlockedRecipes.has(r.id));
}

export function getOwnableRecipes(state) {
  return Object.values(RECIPES).filter(r => state.unlockedRecipes.has(r.id) && !state.ownedRecipes.has(r.id));
}

/**
 * @param {import('./state.js').GameState} state
 * @param {string} recipeId
 * @returns {{success: boolean, reason?: string}}
 */
export function researchRecipe(state, recipeId) {
  const recipe = getRecipeById(recipeId);
  if (!recipe) return { success: false, reason: 'recipe_not_found' };
  if (!state.unlockedRecipes.has(recipeId)) return { success: false, reason: 'not_unlocked' };
  if (state.ownedRecipes.has(recipeId)) return { success: false, reason: 'already_owned' };
  if (state.funds < recipe.researchCost) return { success: false, reason: 'insufficient_funds' };

  state.addFunds(-recipe.researchCost);
  state.ownRecipe(recipeId);
  return { success: true };
}

/**
 * Purchase permanent ownership of a component.
 * @param {import('./state.js').GameState} state
 * @param {string} category
 * @param {string} componentId
 * @returns {{success: boolean, reason?: string}}
 */
export function researchComponent(state, category, componentId) {
  const comp = getComponentById(category, componentId);
  if (!comp) return { success: false, reason: 'component_not_found' };
  if (state.fame < comp.unlockFame) return { success: false, reason: 'not_unlocked' };
  if (state.ownedComponents.has(componentId)) return { success: false, reason: 'already_owned' };
  if (state.funds < comp.researchCost) return { success: false, reason: 'insufficient_funds' };

  state.addFunds(-comp.researchCost);
  state.ownComponent(componentId);
  return { success: true };
}

function isShellObject(item) {
  return item && typeof item === 'object' && typeof item.cost === 'number';
}

export function getShowCost(show) {
  return show.reduce((sum, item) => {
    if (isShellObject(item)) return sum + item.cost;
    const recipe = getRecipeById(item);
    return sum + (recipe ? recipe.cost : 0);
  }, 0);
}

/**
 * @param {import('./state.js').GameState} state
 * @param {string} eventId
 * @param {(Shell|string)[]} show
 * @returns {ValidationResult}
 */
export function validateShow(state, eventId, show) {
  const event = getEventById(eventId);
  if (!event) return { valid: false, reason: 'event_not_found' };

  if (show.length === 0) return { valid: false, reason: 'empty_show' };
  if (event.minShells !== null && show.length < event.minShells) {
    return { valid: false, reason: 'too_few_shells' };
  }
  if (event.maxShells !== null && show.length > event.maxShells) {
    return { valid: false, reason: 'too_many_shells' };
  }

  for (const item of show) {
    if (isShellObject(item)) {
      // Assembled shells must only use unlocked components.
      const accessible = areComponentsAccessible(item.components, state);
      if (!accessible) {
        return { valid: false, reason: 'component_not_unlocked' };
      }
    } else {
      // Legacy recipe-id path.
      if (!state.ownedRecipes.has(item)) {
        return { valid: false, reason: 'recipe_not_owned' };
      }
    }
  }

  let budget = event.budget;
  if (state.competition && state.competition.eventId === event.id) {
    budget = event.roundBudget ?? event.budget;
  }

  const cost = getShowCost(show) + (event.entryFee || 0);
  if (budget !== null && cost > budget) {
    return { valid: false, reason: 'over_budget' };
  }

  if (event.entryFee && state.funds < event.entryFee) {
    return { valid: false, reason: 'insufficient_entry_fee' };
  }

  return { valid: true, cost };
}

/**
 * @param {string} eventId
 * @param {(Shell|string)[]} show
 * @returns {ScoreResult}
 */
export function calculateScore(eventIdOrPrefs, show) {
  let prefs = null;
  if (typeof eventIdOrPrefs === 'string') {
    const event = getEventById(eventIdOrPrefs);
    if (!event || show.length === 0) return { score: 0, baseScore: 0, complexityBonus: 0, repeatPenalty: 0, combos: [] };
    prefs = event.preferences;
  } else {
    prefs = eventIdOrPrefs;
    if (!prefs || show.length === 0) return { score: 0, baseScore: 0, complexityBonus: 0, repeatPenalty: 0, combos: [] };
  }

  const shells = show.map(item => isShellObject(item) ? item : getRecipeById(item)).filter(Boolean);

  let totalMatch = 0;
  let totalComplexity = 0;
  for (const shell of shells) {
    totalMatch += matchShell(shell, prefs);
    totalComplexity += shellComplexity(shell);
  }
  const baseScore = shells.length > 0 ? totalMatch / shells.length : 0;
  const avgComplexity = shells.length > 0 ? totalComplexity / shells.length : 0;
  const complexityPreference = prefs.complexity || 0;
  const complexityBonus = avgComplexity * complexityPreference;

  const { comboBonus, combos } = calculateComboBonus(shells);
  const repeatPenalty = calculateRepeatPenalty(shells);

  const score = baseScore * (1 + complexityBonus + comboBonus) * (1 - repeatPenalty);
  const preferenceHits = preferenceHitCount(prefs, shells);
  return {
    score: Math.min(100, Math.round(score)),
    baseScore: Math.round(baseScore * 10) / 10,
    complexityBonus: Math.round(complexityBonus * 100) / 100,
    comboBonus,
    repeatPenalty,
    combos,
    preferenceHits,
  };
}

function matchShell(shell, prefs) {
  let score = 0;
  let dimensions = 0;

  for (const attr of ['height', 'scale', 'density', 'duration']) {
    const target = prefs[attr] ?? 0.5;
    score += 1 - Math.abs(shell[attr] - target);
    dimensions++;
  }

  score += vectorSimilarity(shell.color, prefs.color || {});
  dimensions++;

  score += vectorSimilarity(shell.effects, prefs.effects || {});
  dimensions++;

  if (prefs.any) {
    score += prefs.any / 10;
  }

  return dimensions > 0 ? (score / dimensions) * 100 : 0;
}

function vectorSimilarity(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  if (keys.size === 0) return 1;
  let dot = 0;
  for (const key of keys) {
    dot += (a[key] || 0) * (b[key] || 0);
  }
  return dot;
}

function averageVector(vectors) {
  const result = {};
  let count = 0;
  for (const v of vectors) {
    if (!v) continue;
    count += 1;
    for (const [key, val] of Object.entries(v)) {
      result[key] = (result[key] || 0) + val;
    }
  }
  if (count === 0) return result;
  for (const key of Object.keys(result)) {
    result[key] /= count;
  }
  return result;
}

function preferenceHitCount(prefs, shells) {
  prefs = prefs || {};
  const dims = [];
  const addScalar = (key, target, getter) => {
    if (target !== undefined && target !== null) {
      dims.push({ target, getter, vector: false });
    }
  };

  addScalar('height', prefs.height, s => s.height);
  addScalar('scale', prefs.scale, s => s.scale);
  addScalar('density', prefs.density, s => s.density);
  addScalar('duration', prefs.duration, s => s.duration);
  addScalar('complexity', prefs.complexity, s => shellComplexity(s));

  if (prefs.color && Object.keys(prefs.color).length > 0) {
    dims.push({ target: prefs.color, getter: s => s.color || {}, vector: true });
  }
  if (prefs.effects && Object.keys(prefs.effects).length > 0) {
    dims.push({ target: prefs.effects, getter: s => s.effects || {}, vector: true });
  }

  let hits = 0;
  for (const dim of dims) {
    let match;
    if (dim.vector) {
      const avg = averageVector(shells.map(dim.getter));
      match = vectorSimilarity(avg, dim.target);
    } else {
      const avg = shells.map(dim.getter).reduce((a, b) => a + b, 0) / shells.length;
      match = Math.max(0, 1 - Math.abs(avg - dim.target));
    }
    if (match >= 0.5) hits += 1;
  }

  return { hits, total: dims.length };
}

function shellComplexity(shell) {
  let c = 0;
  if (shell.hasSecondary) c += 0.15;
  if (Object.keys(shell.color || {}).length >= 2) c += 0.05;
  if (Object.keys(shell.effects || {}).length >= 2) c += 0.05;
  return c;
}

function calculateComboBonus(shells) {
  let totalBonus = 0;
  const combos = [];
  for (const rule of COMBO_RULES) {
    if (rule.check(shells)) {
      totalBonus += rule.bonus;
      combos.push(rule.id);
    }
  }
  return { comboBonus: totalBonus, combos };
}

function shellFingerprint(shell) {
  return shell.recipeId || shell.blueprintId || JSON.stringify(shell.components || {});
}

function calculateRepeatPenalty(shells) {
  const counts = {};
  for (const shell of shells) {
    const key = shellFingerprint(shell);
    counts[key] = (counts[key] || 0) + 1;
  }
  let penalty = 0;
  for (const count of Object.values(counts)) {
    if (count <= 2) continue;
    if (count === 3) penalty += 0.04 * count;
    else penalty += 0.08 * count;
  }
  return Math.min(penalty, 0.5);
}

export function getScoreMultiplier(score) {
  if (score >= 90) return 1.5;
  if (score >= 75) return 1.2;
  if (score >= 60) return 1.0;
  if (score >= 40) return 0.7;
  return 0.4;
}

export function getScoreGrade(score) {
  if (score >= 90) return 'S';
  if (score >= 75) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}

const COMPETITION_FAME_FRACTIONS = [1, 0.6, 0.35, 0.35, 0.15, 0.15, 0.15, 0.15, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05];
const COMPETITION_FUNDS_FRACTIONS = [0.5, 0.3, 0.15, 0.15, 0.05, 0.05, 0.05, 0.05, 0, 0, 0, 0, 0, 0, 0, 0];
const COMPETITION_BASE_SCORES = { apprentice: 50, skilled: 60, technician: 70, expert: 80, master: 90 };

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function getCompetitionRounds(event) {
  if (event.rounds) return event.rounds;
  return event.rank === 'expert' || event.rank === 'master' ? 4 : 3;
}

function generateOpponentScore(event, round) {
  const rounds = getCompetitionRounds(event);
  const base = COMPETITION_BASE_SCORES[event.rank] ?? 60;
  const spread = 8;
  const mid = (rounds - 1) / 2;
  const salt = (hashString(event.id) % 11) - 5;
  const score = base + (round - mid) * spread + salt;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getRoundName(round, totalRounds) {
  const distance = totalRounds - round;
  if (distance === 0) return '决赛';
  if (distance === 1) return '半决赛';
  if (totalRounds === 3 && round === 1) return '初赛';
  if (totalRounds === 4 && round === 1) return '1/8 决赛';
  if (totalRounds === 4 && round === 2) return '1/4 决赛';
  return `第 ${round} 轮`;
}

export function getCompetitionRoundNames(event) {
  const rounds = getCompetitionRounds(event);
  return Array.from({ length: rounds }, (_, i) => getRoundName(i + 1, rounds));
}

function lerpScalarRound(base, round, totalRounds) {
  if (totalRounds <= 1) return base;
  const t = (round - 1) / (totalRounds - 1);
  const factor = 0.8 + t * 0.2; // 0.8 -> 1.0
  return Math.max(0, Math.min(1, base * factor));
}

function scaleVectorRound(vector, round, totalRounds) {
  if (!vector || Object.keys(vector).length === 0) return vector;
  const t = (round - 1) / Math.max(1, totalRounds - 1);
  const factor = 0.7 + t * 0.3; // 0.7 -> 1.0, keep theme stable
  const result = {};
  for (const [key, val] of Object.entries(vector)) {
    result[key] = Math.max(0, Math.min(1, val * factor));
  }
  return result;
}

export function getRoundPreference(event, round, totalRounds) {
  const base = event.preferences || {};
  const prefs = {
    height: lerpScalarRound(base.height ?? 0.5, round, totalRounds),
    scale: lerpScalarRound(base.scale ?? 0.5, round, totalRounds),
    density: lerpScalarRound(base.density ?? 0.5, round, totalRounds),
    duration: lerpScalarRound(base.duration ?? 0.5, round, totalRounds),
    complexity: lerpScalarRound(base.complexity ?? 0, round, totalRounds),
    color: scaleVectorRound(base.color, round, totalRounds),
    effects: scaleVectorRound(base.effects, round, totalRounds),
    any: base.any,
  };
  return prefs;
}

export function startCompetition(state, eventId) {
  const event = getEventById(eventId);
  if (!event) return { success: false, reason: 'event_not_found' };
  if (event.type !== 'competition') return { success: false, reason: 'not_competition' };

  const totalRounds = getCompetitionRounds(event);
  state.competition = {
    eventId,
    round: 1,
    totalRounds,
    remaining: 2 ** totalRounds,
    roundResults: [],
    eliminated: false,
    finished: false,
  };
  state.selectedEventId = eventId;
  state.currentShow = [];
  return { success: true };
}

export function getCurrentRoundBudget(state) {
  if (!state.competition) return null;
  const event = getEventById(state.competition.eventId);
  if (!event) return null;
  return event.roundBudget ?? event.budget;
}

export function getCurrentRoundPreference(state) {
  if (!state.competition) return null;
  const event = getEventById(state.competition.eventId);
  if (!event) return null;
  return getRoundPreference(event, state.competition.round, state.competition.totalRounds);
}

export function settleCompetitionRound(state, show) {
  if (!state.competition) return { success: false, reason: 'no_competition' };
  if (state.competition.finished) return { success: false, reason: 'competition_finished' };

  const event = getEventById(state.competition.eventId);
  if (!event) return { success: false, reason: 'event_not_found' };

  const round = state.competition.round;
  const totalRounds = state.competition.totalRounds;
  const roundName = getRoundName(round, totalRounds);

  const validation = validateShow(state, event.id, show);
  if (!validation.valid) return { success: false, reason: validation.reason };

  const roundPreference = getRoundPreference(event, round, totalRounds);
  const scoreResult = calculateScore(roundPreference, show);
  const opponentScore = generateOpponentScore(event, round - 1);
  const won = scoreResult.score > opponentScore;

  state.addFunds(-validation.cost);

  state.competition.roundResults.push({
    round,
    name: roundName,
    playerScore: scoreResult.score,
    opponentScore,
    won,
    show: JSON.parse(JSON.stringify(show)),
    cost: validation.cost,
  });

  const roundResult = {
    round,
    name: roundName,
    playerScore: scoreResult.score,
    opponentScore,
    won,
    score: scoreResult,
    cost: validation.cost,
  };

  if (!won) {
    const finalRank = 2 ** (totalRounds - round + 1);
    state.competition.eliminated = true;
    state.competition.finished = true;
    return { success: true, roundResult, eliminated: true, finalRank };
  }

  if (round === totalRounds) {
    state.competition.finished = true;
    return { success: true, roundResult, champion: true, finalRank: 1 };
  }

  state.competition.round += 1;
  state.competition.remaining = Math.floor(state.competition.remaining / 2);
  state.currentShow = [];

  return { success: true, roundResult, advanced: true, nextRound: state.competition.round };
}

export function finishCompetition(state) {
  if (!state.competition) return { success: false, reason: 'no_competition' };

  const event = getEventById(state.competition.eventId);
  if (!event) return { success: false, reason: 'event_not_found' };

  const { roundResults, totalRounds } = state.competition;
  let finalRank = 1;
  let lastScore = 0;
  for (const r of roundResults) {
    if (r.played !== false) lastScore = r.playerScore;
    if (!r.won) {
      finalRank = 2 ** (totalRounds - r.round + 1);
      break;
    }
  }

  const rewards = calculateCompetitionRewards(event, lastScore, finalRank);

  const isFirstClear = event.isMain && !state.isMainEventCompleted(event.id);
  if (isFirstClear) {
    rewards.funds += event.firstClearBonus.funds;
    rewards.fame += event.firstClearBonus.fame;
  }

  state.addFunds(rewards.funds);
  state.addFame(rewards.fame);

  if (event.isMain) {
    state.completeMainEvent(event.id);
  }

  const rankedUp = canRankUp(state) ? rankUp(state) : false;

  const competitionData = {
    ...state.competition,
    finalRank,
    rewards,
    lastScore,
  };
  state.competition = null;
  state.currentShow = [];

  return {
    success: true,
    finalRank,
    rewards,
    isFirstClear,
    rankedUp,
    competition: competitionData,
  };
}

export function runCompetition(event, playerScore) {
  const rounds = getCompetitionRounds(event);
  const roundResults = [];
  let finalRank = 1;
  let eliminated = false;

  for (let round = 0; round < rounds; round++) {
    const roundNumber = round + 1;
    if (eliminated) {
      roundResults.push({
        round: roundNumber,
        name: getRoundName(roundNumber, rounds),
        playerScore: null,
        opponentScore: null,
        won: false,
        played: false,
      });
      continue;
    }

    const opponentScore = generateOpponentScore(event, round);
    const won = playerScore > opponentScore;
    roundResults.push({
      round: roundNumber,
      name: getRoundName(roundNumber, rounds),
      playerScore,
      opponentScore,
      won,
      played: true,
    });
    if (!won) {
      finalRank = 2 ** (rounds - round);
      eliminated = true;
    }
  }

  return { finalRank, roundResults, totalRounds: rounds };
}

export function calculateCompetitionRewards(event, playerScore, finalRank) {
  const multiplier = getScoreMultiplier(playerScore);
  const index = Math.min(finalRank, COMPETITION_FAME_FRACTIONS.length) - 1;
  const fameGain = event.rewards.fame * (playerScore / 100) * COMPETITION_FAME_FRACTIONS[index] * multiplier;
  const fundsGain = event.rewards.funds * (playerScore / 100) * COMPETITION_FUNDS_FRACTIONS[index] * multiplier;
  return {
    funds: Math.round(fundsGain),
    fame: Math.round(fameGain),
  };
}

export function calculateRewards(eventId, score) {
  const event = getEventById(eventId);
  if (!event) return { funds: 0, fame: 0 };

  const multiplier = getScoreMultiplier(score);
  let fundsGain = 0;
  let fameGain = 0;

  if (event.type === 'competition') {
    fameGain = event.rewards.fame * (score / 100) * multiplier;
    fundsGain = event.rewards.funds * (score / 100) * 0.5 * multiplier;
  } else if (event.type === 'activity') {
    fundsGain = event.rewards.funds * (score / 100) * multiplier;
    fameGain = event.rewards.fame * (score / 100) * 0.5 * multiplier;
  } else {
    // fallback / repeatable
    fundsGain = event.rewards.funds * (score / 100) * multiplier;
    fameGain = event.rewards.fame * (score / 100) * multiplier;
  }

  return {
    funds: Math.round(fundsGain),
    fame: Math.round(fameGain),
  };
}

/**
 * @param {import('./state.js').GameState} state
 * @param {string} eventId
 * @param {(Shell|string)[]} show
 * @returns {SettlementResult}
 */
export function settleEvent(state, eventId, show) {
  const validation = validateShow(state, eventId, show);
  if (!validation.valid) return { success: false, reason: validation.reason };

  const event = getEventById(eventId);
  if (event.type === 'competition') {
    return { success: false, reason: 'use_competition_flow' };
  }

  const scoreResult = calculateScore(eventId, show);
  const rewards = calculateRewards(eventId, scoreResult.score);

  const isFirstClear = event.isMain && !state.isMainEventCompleted(eventId);
  if (isFirstClear) {
    rewards.funds += event.firstClearBonus.funds;
    rewards.fame += event.firstClearBonus.fame;
  }

  state.addFunds(-validation.cost);
  state.addFunds(rewards.funds);
  state.addFame(rewards.fame);

  if (event.isMain) {
    state.completeMainEvent(eventId);
  }

  const rankedUp = canRankUp(state) ? rankUp(state) : false;

  return {
    success: true,
    score: scoreResult,
    rewards,
    cost: validation.cost,
    isFirstClear,
    rankedUp,
    competition: null,
  };
}
