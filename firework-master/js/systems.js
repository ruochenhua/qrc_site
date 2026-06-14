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

function isQuantityMapAccessible(map, category, state) {
  for (const [id, qty] of Object.entries(map || {})) {
    if (!qty) continue;
    const comp = getComponentById(category, id);
    if (!comp || state.fame < comp.unlockFame) return false;
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
      if (!comp || state.fame < comp.unlockFame) return false;
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

export function getAvailableEvents(state) {
  return Object.values(EVENTS).filter(event => isEventAvailable(state, event.id));
}

export function isEventAvailable(state, eventId) {
  const event = getEventById(eventId);
  if (!event) return false;

  const currentIndex = getRankIndex(state.rank);
  const eventRankIndex = getRankIndex(event.rank);
  if (eventRankIndex > currentIndex) return false;

  if (event.isMain && state.isMainEventCompleted(event.id)) return false;

  // Competitions require all main events of lower/equal rank to be completed in order.
  if (event.isMain) {
    const previousMainIds = getMainEventIdsUpToRank(state.rank);
    for (const id of previousMainIds) {
      if (id === event.id) break;
      if (!state.isMainEventCompleted(id)) return false;
    }
  }

  return true;
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

  const cost = getShowCost(show) + (event.entryFee || 0);
  if (event.budget !== null && cost > event.budget) {
    return { valid: false, reason: 'over_budget' };
  }

  if (event.entryFee && state.funds < event.entryFee) {
    return { valid: false, reason: 'insufficient_entry_fee' };
  }

  return { valid: true, cost };
}

export function calculateScore(eventId, show) {
  const event = getEventById(eventId);
  if (!event || show.length === 0) return { score: 0, baseScore: 0, complexityBonus: 0, repeatPenalty: 0, combos: [] };

  const shells = show.map(item => isShellObject(item) ? item : getRecipeById(item)).filter(Boolean);
  const prefs = event.preferences;

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
  return {
    score: Math.min(100, Math.round(score)),
    baseScore: Math.round(baseScore * 10) / 10,
    complexityBonus: Math.round(complexityBonus * 100) / 100,
    comboBonus,
    repeatPenalty,
    combos,
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

export function settleEvent(state, eventId, show) {
  const validation = validateShow(state, eventId, show);
  if (!validation.valid) return { success: false, reason: validation.reason };

  const event = getEventById(eventId);
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
  };
}
