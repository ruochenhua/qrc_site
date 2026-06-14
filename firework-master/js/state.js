import {
  SAVE_KEY,
  SCHEMA_VERSION,
  STARTING_FUNDS,
  STARTING_FAME,
  STARTING_RANK,
  STARTING_RECIPES,
} from './config.js';

export class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.funds = STARTING_FUNDS;
    this.fame = STARTING_FAME;
    this.rank = STARTING_RANK;
    this.unlockedRecipes = new Set(STARTING_RECIPES);
    this.ownedRecipes = new Set(STARTING_RECIPES);
    this.completedMainEvents = new Set();
    this.phase = 'START';
    this.selectedEventId = null;
    this.currentShow = [];
    this.gameOver = false;
    this.won = false;
    this.blueprintSlots = 5;
    this.ownedBlueprints = new Set();
    this.blueprints = {};
  }

  addFunds(delta) {
    this.funds = Math.max(0, this.funds + delta);
  }

  addFame(delta) {
    this.fame = Math.max(0, this.fame + delta);
  }

  unlockRecipe(recipeId) {
    this.unlockedRecipes.add(recipeId);
  }

  ownRecipe(recipeId) {
    if (!this.unlockedRecipes.has(recipeId)) return false;
    this.ownedRecipes.add(recipeId);
    return true;
  }

  completeMainEvent(eventId) {
    this.completedMainEvents.add(eventId);
  }

  isMainEventCompleted(eventId) {
    return this.completedMainEvents.has(eventId);
  }

  selectEvent(eventId) {
    this.selectedEventId = eventId;
    this.currentShow = [];
  }

  clearShow() {
    this.currentShow = [];
  }

  addToShow(recipeId) {
    this.currentShow.push(recipeId);
  }

  removeFromShow(index) {
    if (index >= 0 && index < this.currentShow.length) {
      this.currentShow.splice(index, 1);
    }
  }

  setShow(recipeIds) {
    this.currentShow = [...recipeIds];
  }

  saveBlueprint(name, components) {
    if (this.ownedBlueprints.size >= this.blueprintSlots) {
      return { success: false, reason: 'slots_full' };
    }
    const id = `bp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const blueprint = { id, name, components: JSON.parse(JSON.stringify(components)) };
    this.blueprints[id] = blueprint;
    this.ownedBlueprints.add(id);
    return { success: true, blueprint };
  }

  loadBlueprint(id) {
    const blueprint = this.blueprints[id];
    if (!blueprint) return null;
    return JSON.parse(JSON.stringify(blueprint.components));
  }

  deleteBlueprint(id) {
    if (!this.ownedBlueprints.has(id)) return false;
    delete this.blueprints[id];
    this.ownedBlueprints.delete(id);
    return true;
  }

  expandBlueprintSlot() {
    const cost = 100 + (this.blueprintSlots - 5) * 50;
    if (this.funds < cost) return { success: false, reason: 'insufficient_funds' };
    this.addFunds(-cost);
    this.blueprintSlots += 1;
    return { success: true, cost };
  }

  win() {
    this.gameOver = true;
    this.won = true;
  }
}

export class SaveSystem {
  static KEY = SAVE_KEY;

  static save(state) {
    const data = {
      schemaVersion: SCHEMA_VERSION,
      funds: state.funds,
      fame: state.fame,
      rank: state.rank,
      unlockedRecipes: Array.from(state.unlockedRecipes),
      ownedRecipes: Array.from(state.ownedRecipes),
      completedMainEvents: Array.from(state.completedMainEvents),
      phase: state.phase,
      selectedEventId: state.selectedEventId,
      currentShow: state.currentShow,
      gameOver: state.gameOver,
      won: state.won,
      blueprintSlots: state.blueprintSlots,
      ownedBlueprints: Array.from(state.ownedBlueprints),
      blueprints: state.blueprints,
      timestamp: Date.now(),
    };
    localStorage.setItem(this.KEY, JSON.stringify(data));
  }

  static load() {
    const raw = localStorage.getItem(this.KEY);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return null;
      if (data.schemaVersion !== SCHEMA_VERSION) {
        return this._migrate(data);
      }
      return data;
    } catch {
      return null;
    }
  }

  static apply(state, data) {
    if (!data) return false;
    state.funds = data.funds ?? STARTING_FUNDS;
    state.fame = data.fame ?? STARTING_FAME;
    state.rank = data.rank ?? STARTING_RANK;
    state.unlockedRecipes = new Set(data.unlockedRecipes ?? STARTING_RECIPES);
    state.ownedRecipes = new Set(data.ownedRecipes ?? STARTING_RECIPES);
    state.completedMainEvents = new Set(data.completedMainEvents ?? []);
    state.phase = data.phase ?? 'START';
    state.selectedEventId = data.selectedEventId ?? null;
    state.currentShow = Array.isArray(data.currentShow) ? [...data.currentShow] : [];
    state.gameOver = data.gameOver ?? false;
    state.won = data.won ?? false;
    state.blueprintSlots = data.blueprintSlots ?? 5;
    state.ownedBlueprints = new Set(data.ownedBlueprints ?? []);
    state.blueprints = data.blueprints ? { ...data.blueprints } : {};
    return true;
  }

  static exists() {
    return localStorage.getItem(this.KEY) !== null;
  }

  static clear() {
    localStorage.removeItem(this.KEY);
  }

  static _migrate(_data) {
    // No older schema versions yet.
    return null;
  }
}
