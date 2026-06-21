export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

/**
 * @typedef {Object} Rank
 * @property {string} id
 * @property {string} name
 * @property {number} threshold
 * @property {number|null} nextThreshold
 */

/**
 * @typedef {Object} Gunpowder
 * @property {string} id
 * @property {string} name
 * @property {number} thrust
 * @property {number} cost
 * @property {number} unlockFame
 * @property {number} researchCost
 * @property {string} desc
 */

/**
 * @typedef {Object} Casing
 * @property {string} id
 * @property {string} name
 * @property {string} shape
 * @property {number} capacity
 * @property {number} [secondaryCapacity]
 * @property {number} layers
 * @property {number} scaleMultiplier
 * @property {number} cost
 * @property {number} unlockFame
 * @property {number} researchCost
 * @property {string} desc
 */

/**
 * @typedef {Object} Colorant
 * @property {string} id
 * @property {string} name
 * @property {string} color
 * @property {number} density
 * @property {number} cost
 * @property {number} unlockFame
 * @property {number} researchCost
 * @property {string} desc
 */

/**
 * @typedef {Object} Fuse
 * @property {string} id
 * @property {string} name
 * @property {string} length
 * @property {number} heightFactor
 * @property {number} cost
 * @property {number} unlockFame
 * @property {number} researchCost
 * @property {string} desc
 */

/**
 * @typedef {Object} EffectAgent
 * @property {string} id
 * @property {string} name
 * @property {string} effect
 * @property {number} threshold
 * @property {number} intensity
 * @property {number} cost
 * @property {number} unlockFame
 * @property {number} researchCost
 * @property {string} desc
 */

/**
 * @typedef {Object} Recipe
 * @property {string} id
 * @property {string} name
 * @property {Object} components
 * @property {number} unlockFame
 * @property {number} researchCost
 * @property {string} desc
 */

/**
 * @typedef {Object} Event
 * @property {string} id
 * @property {string} name
 * @property {'competition'|'activity'|'repeatable'|'fallback'} type
 * @property {string} rank
 * @property {boolean} isMain
 * @property {number|null} budget
 * @property {number} minShells
 * @property {number} maxShells
 * @property {number} entryFee
 * @property {Object} preferences
 * @property {Object} rewards
 * @property {Object} firstClearBonus
 * @property {string} desc
 * @property {string} preferenceDesc
 * @property {Object} backdrop
 */

/**
 * @typedef {Object} ComboRule
 * @property {string} id
 * @property {string} name
 * @property {number} bonus
 * @property {Function} check
 */

export const SAVE_KEY = 'firework_master_save_v1';
export const SCHEMA_VERSION = 1;

export const RANK_ORDER = ['apprentice', 'skilled', 'technician', 'expert', 'master'];

export const RANKS = {
  apprentice: { id: 'apprentice', name: '学徒', threshold: 0, nextThreshold: 150 },
  skilled:    { id: 'skilled',    name: '熟手', threshold: 150, nextThreshold: 500 },
  technician: { id: 'technician', name: '技师', threshold: 500, nextThreshold: 1200 },
  expert:     { id: 'expert',     name: '名家', threshold: 1200, nextThreshold: 2500 },
  master:     { id: 'master',     name: '大师', threshold: 2500, nextThreshold: null },
};

export const COMPONENT_CATEGORIES = ['gunpowder', 'casing', 'colorant', 'fuse', 'effect'];

export const COMPONENTS = {
  gunpowder: {
    g001: { id: 'g001', name: '黑火药', thrust: 1.0, cost: 2, unlockFame: 0, desc: '最基础的火药，推力一般，便宜稳定。' },
    g002: { id: 'g002', name: '细颗粒火药', thrust: 1.5, cost: 4, unlockFame: 100, desc: '颗粒更细，燃烧更快，推力更强。' },
    g003: { id: 'g003', name: '高性能火药', thrust: 2.2, cost: 8, unlockFame: 400, desc: '专业比赛级火药，能打出高空大花。' },
    g004: { id: 'g004', name: '军用级火药', thrust: 3.0, cost: 15, unlockFame: 1200, desc: '极限推力，轻松突破高空限制。' },
  },
  casing: {
    c001: { id: 'c001', name: '小号牡丹壳', shape: 'peony', capacity: 8, layers: 1, scaleMultiplier: 0.9, cost: 3, unlockFame: 0, desc: '新手常用，球形炸开，小巧。' },
    c002: { id: 'c002', name: '中号牡丹壳', shape: 'peony', capacity: 14, layers: 1, scaleMultiplier: 1.0, cost: 5, unlockFame: 0, desc: '标准牡丹壳，容量适中。' },
    c003: { id: 'c003', name: '小号菊花壳', shape: 'chrysanthemum', capacity: 10, layers: 1, scaleMultiplier: 1.0, cost: 4, unlockFame: 100, desc: '细长花瓣状炸开。' },
    c004: { id: 'c004', name: '中号菊花壳', shape: 'chrysanthemum', capacity: 16, layers: 1, scaleMultiplier: 1.1, cost: 6, unlockFame: 100, desc: '标准菊花壳，花瓣更丰满。' },
    c005: { id: 'c005', name: '环壳', shape: 'ring', capacity: 8, layers: 1, scaleMultiplier: 0.95, cost: 5, unlockFame: 100, desc: '炸成空心圆环。' },
    c006: { id: 'c006', name: '心壳', shape: 'heart', capacity: 10, layers: 1, scaleMultiplier: 1.0, cost: 6, unlockFame: 200, desc: '炸成爱心形状。' },
    c007: { id: 'c007', name: '星壳', shape: 'star', capacity: 10, layers: 1, scaleMultiplier: 1.0, cost: 6, unlockFame: 200, desc: '炸成五角星形状。' },
    c008: { id: 'c008', name: '柳壳', shape: 'willow', capacity: 12, layers: 1, scaleMultiplier: 1.05, cost: 7, unlockFame: 400, desc: '粒子向下垂落，像柳枝。' },
    c009: { id: 'c009', name: '棕榈壳', shape: 'palm', capacity: 16, layers: 1, scaleMultiplier: 1.15, cost: 8, unlockFame: 400, desc: '多条放射臂，像棕榈叶。' },
    c010: { id: 'c010', name: '小号双层壳', shape: 'peony', capacity: 10, secondaryCapacity: 4, layers: 2, scaleMultiplier: 1.0, cost: 10, unlockFame: 400, desc: '支持主爆后第二次小爆炸。' },
    c011: { id: 'c011', name: '中号双层壳', shape: 'chrysanthemum', capacity: 14, secondaryCapacity: 6, layers: 2, scaleMultiplier: 1.1, cost: 14, unlockFame: 1200, desc: '双层菊花壳，二次爆炸更华丽。' },
    c012: { id: 'c012', name: '大号双层壳', shape: 'peony', capacity: 18, secondaryCapacity: 8, layers: 2, scaleMultiplier: 1.2, cost: 20, unlockFame: 3000, desc: '顶级双层壳，压轴专用。' },
  },
  colorant: {
    col001: { id: 'col001', name: '红剂', color: 'red', density: 1.0, cost: 1, unlockFame: 0, desc: '经典红色，节日气氛。' },
    col002: { id: 'col002', name: '金剂', color: 'gold', density: 1.0, cost: 1, unlockFame: 0, desc: '华丽金色，适合庆典。' },
    col003: { id: 'col003', name: '蓝剂', color: 'blue', density: 1.0, cost: 2, unlockFame: 100, desc: '清冷蓝色，专业赛事常用。' },
    col004: { id: 'col004', name: '绿剂', color: 'green', density: 1.0, cost: 2, unlockFame: 100, desc: '自然绿色，柳枝必备。' },
    col005: { id: 'col005', name: '白剂', color: 'white', density: 1.0, cost: 1, unlockFame: 0, desc: '纯净白色，百搭。' },
    col006: { id: 'col006', name: '紫剂', color: 'purple', density: 1.0, cost: 3, unlockFame: 400, desc: '高贵紫色，浪漫场合。' },
    col007: { id: 'col007', name: '粉剂', color: 'pink', density: 1.0, cost: 3, unlockFame: 400, desc: '柔和粉色，婚礼常用。' },
    col008: { id: 'col008', name: '银剂', color: 'silver', density: 1.0, cost: 2, unlockFame: 1200, desc: '闪亮银色，高级感。' },
    col009: { id: 'col009', name: '混色剂', color: 'multi', density: 1.0, cost: 5, unlockFame: 3000, desc: '自动循环多种颜色。' },
  },
  fuse: {
    f001: { id: 'f001', name: '短引线', length: 'short', heightFactor: 0.6, cost: 1, unlockFame: 0, desc: '低空爆炸，适合近距离观赏。' },
    f002: { id: 'f002', name: '中引线', length: 'medium', heightFactor: 1.0, cost: 1, unlockFame: 0, desc: '标准高度，最常用。' },
    f003: { id: 'f003', name: '长引线', length: 'long', heightFactor: 1.4, cost: 2, unlockFame: 100, desc: '高空爆炸，适合大型赛事。' },
    f004: { id: 'f004', name: '超长引线', length: 'ultra', heightFactor: 1.8, cost: 4, unlockFame: 1200, desc: '极限高空，压轴专用。' },
  },
  effect: {
    e001: { id: 'e001', name: '闪光粉', effect: 'glitter', threshold: 2, intensity: 0.5, cost: 2, unlockFame: 100, desc: '粒子闪烁，增加华丽感。' },
    e002: { id: 'e002', name: '爆响药', effect: 'crackle', threshold: 2, intensity: 0.5, cost: 2, unlockFame: 0, desc: '爆炸时发出噼啪声（视觉表现：细碎火花）。' },
    e003: { id: 'e003', name: '尾迹药', effect: 'tail', threshold: 2, intensity: 0.5, cost: 2, unlockFame: 100, desc: '上升阶段和粒子拖尾明显。' },
    e004: { id: 'e004', name: '频闪药', effect: 'strobe', threshold: 2, intensity: 0.5, cost: 3, unlockFame: 400, desc: '粒子明暗交替，节奏感强。' },
    e005: { id: 'e005', name: '花束药', effect: 'bouquet', threshold: 3, intensity: 0.4, cost: 4, unlockFame: 400, desc: '爆炸后散落小花团。' },
    e006: { id: 'e006', name: '二次爆炸药', effect: 'secondary', threshold: 4, intensity: 0.3, cost: 6, unlockFame: 400, desc: '装在多层壳二层，主爆后触发第二波爆炸。' },
  },
};

for (const category of Object.values(COMPONENTS)) {
  for (const comp of Object.values(category)) {
    if (typeof comp.researchCost !== 'number') {
      comp.researchCost = Math.max(0, Math.floor(comp.unlockFame / 2));
    }
  }
}

// System recipes are example blueprints that demonstrate effective component combinations.
// They are free examples, not the core unlock path.
export const RECIPES = {
  // Apprentice examples (starting)
  r001: { id: 'r001', name: '红牡丹', components: { gunpowder: { g001: 3 }, casing: 'c001', colorant: { col001: 3 }, fuse: 'f002', effect: { e002: 2 } }, unlockFame: 0, researchCost: 0, desc: '最经典的开场花：红色牡丹配爆响。' },
  r002: { id: 'r002', name: '金柳', components: { gunpowder: { g001: 4 }, casing: 'c008', colorant: { col002: 4 }, fuse: 'f002', effect: {} }, unlockFame: 0, researchCost: 0, desc: '金色柳枝垂落，温柔绵长。' },
  r003: { id: 'r003', name: '绿闪', components: { gunpowder: { g001: 2 }, casing: 'c001', colorant: { col004: 3 }, fuse: 'f001', effect: { e001: 3 } }, unlockFame: 0, researchCost: 0, desc: '低空绿色闪烁，活泼俏皮。' },

  // Skilled examples (unlockFame 100)
  r004: { id: 'r004', name: '蓝环', components: { gunpowder: { g002: 4 }, casing: 'c005', colorant: { col003: 4 }, fuse: 'f001', effect: {} }, unlockFame: 100, researchCost: 80, desc: '高空中蓝色圆环，清冷醒目。' },
  r005: { id: 'r005', name: '爆响菊', components: { gunpowder: { g002: 4 }, casing: 'c003', colorant: { col002: 3 }, fuse: 'f001', effect: { e002: 3 } }, unlockFame: 100, researchCost: 80, desc: '爆裂声响，节日气氛拉满。' },

  // Technician examples (unlockFame 400)
  r006: { id: 'r006', name: '蓝白棕榈', components: { gunpowder: { g003: 7 }, casing: 'c009', colorant: { col003: 5 }, fuse: 'f003', effect: { e003: 4 } }, unlockFame: 400, researchCost: 200, desc: '蓝色棕榈叶配银色尾迹。' },
  r007: { id: 'r007', name: '粉星', components: { gunpowder: { g002: 4 }, casing: 'c007', colorant: { col007: 4 }, fuse: 'f001', effect: { e004: 2 } }, unlockFame: 400, researchCost: 200, desc: '粉色星点快速闪烁。' },

  // Expert examples (unlockFame 1200)
  r008: { id: 'r008', name: '千轮', components: { gunpowder: { g003: 6 }, casing: 'c004', colorant: { col002: 5 }, fuse: 'f003', effect: { e005: 4 } }, unlockFame: 1200, researchCost: 500, desc: '万千轮状花层层叠叠。' },
  r009: { id: 'r009', name: '二次绽放', components: { gunpowder: { g003: 4 }, casing: 'c010', colorant: { col001: 3 }, fuse: 'f002', effect: {}, secondary: { colorant: { col005: 1 }, effect: { e006: 3 } } }, unlockFame: 1200, researchCost: 500, desc: '红牡丹主爆后二次绽放白色小花。' },
};

export const EVENT_TYPES = {
  competition: { name: '比赛', labelClass: 'type-competition' },
  activity:    { name: '活动', labelClass: 'type-activity' },
  repeatable:  { name: '重复', labelClass: 'type-repeatable' },
  fallback:    { name: '保底', labelClass: 'type-fallback' },
};

export const EVENTS = {
  // Apprentice
  e001: { id: 'e001', name: '村口庙会', type: 'competition', rank: 'apprentice', isMain: true, budget: 80, roundBudget: 80, minShells: 2, maxShells: 6, entryFee: 0, preferences: { height: 0.3, scale: 0.4, density: 0.5, duration: 0.4, color: { red: 0.7, gold: 0.3 }, effects: { crackle: 0.6 }, complexity: 0.1 }, rewards: { funds: 30, fame: 60 }, firstClearBonus: { funds: 50, fame: 150 }, desc: '热闹的小庙会，红色和爆响最受欢迎。', preferenceDesc: '庙会的评委们就爱那股热闹劲儿：火红的牡丹在空中炸开，再配上一串噼里啪啦的爆响，最能点燃人群。', backdrop: { sky: 'festival', ground: 'village', clouds: 'few' }, },
  e002: { id: 'e002', name: '小镇夜市', type: 'activity', rank: 'apprentice', isMain: false, budget: null, minShells: 1, maxShells: 30, entryFee: 0, preferences: { height: 0.2, scale: 0.5, density: 0.5, duration: 0.3, color: { gold: 1 }, effects: {}, complexity: 0 }, rewards: { funds: 80, fame: 20 }, firstClearBonus: { funds: 0, fame: 0 }, desc: '夜市暖场表演，金色短烟花最讨喜。', preferenceDesc: '夜市离得近、看得清，金灿灿的低空小烟花最讨喜，既热闹又不扰民。', backdrop: { sky: 'twilight', ground: 'village', clouds: 'none' }, },
  e003: { id: 'e003', name: '街头小表演', type: 'fallback', rank: 'apprentice', isMain: false, budget: 20, minShells: 1, maxShells: 4, entryFee: 0, preferences: { height: 0.5, scale: 0.5, density: 0.5, duration: 0.5, color: {}, effects: {}, complexity: 0, any: 5 }, rewards: { funds: 25, fame: 5 }, firstClearBonus: { funds: 0, fame: 0 }, desc: '零门槛小表演，赚点糊口钱。', preferenceDesc: '这种街头小场子不挑活儿，能放响、能开花就行，随便露一手就能拿到赏钱。', backdrop: { sky: 'clear', ground: 'grass', clouds: 'none' }, },

  // Skilled
  e004: { id: 'e004', name: '县城花火大会', type: 'competition', rank: 'skilled', isMain: true, budget: 200, roundBudget: 140, minShells: 3, maxShells: 8, entryFee: 0, preferences: { height: 0.6, scale: 0.7, density: 0.6, duration: 0.6, color: { blue: 0.5, white: 0.5 }, effects: { tail: 0.4, glitter: 0.4 }, complexity: 0.2 }, rewards: { funds: 80, fame: 150 }, firstClearBonus: { funds: 120, fame: 350 }, desc: '县城最大的花火大会，菊形和蓝白色是主流。', preferenceDesc: '县城花火大会讲究一个“雅”字：高空舒展的大朵菊花，蓝白冷色调，拖出一道银闪闪的尾迹，最是赏心悦目。', backdrop: { sky: 'midnight', ground: 'village', clouds: 'few' }, },
  e005: { id: 'e005', name: '婚礼庆典', type: 'activity', rank: 'skilled', isMain: false, budget: null, minShells: 2, maxShells: 40, entryFee: 0, preferences: { height: 0.2, scale: 0.5, density: 0.6, duration: 0.5, color: { pink: 1 }, effects: {}, complexity: 0 }, rewards: { funds: 200, fame: 40 }, firstClearBonus: { funds: 0, fame: 0 }, desc: '浪漫的婚礼现场，粉色爱心和低空烟花最应景。', preferenceDesc: '婚礼现场想要浪漫又温馨：低空炸开的粉色爱心，缓缓落下，别惊扰了新娘的裙摆。', backdrop: { sky: 'twilight', ground: 'park', clouds: 'none' }, },
  e006: { id: 'e006', name: '商场开业', type: 'repeatable', rank: 'skilled', isMain: false, budget: 150, minShells: 2, maxShells: 8, entryFee: 0, preferences: { height: 0.4, scale: 0.6, density: 0.6, duration: 0.5, color: { gold: 1 }, effects: { crackle: 0.5 }, complexity: 0 }, rewards: { funds: 120, fame: 30 }, firstClearBonus: { funds: 0, fame: 0 }, desc: '商场开业助兴，金色爆响最热闹。', preferenceDesc: '开业图个彩头：满天的金色，加上噼里啪啦的爆响，越热闹越有人气。', backdrop: { sky: 'clear', ground: 'city', clouds: 'none' }, },

  // Technician
  e007: { id: 'e007', name: '市级烟花赛', type: 'competition', rank: 'technician', isMain: true, budget: 450, roundBudget: 320, minShells: 4, maxShells: 10, entryFee: 0, preferences: { height: 0.9, scale: 0.8, density: 0.6, duration: 0.8, color: { red: 0.2, gold: 0.2, blue: 0.2, green: 0.2, white: 0.2 }, effects: { tail: 0.5, strobe: 0.5 }, complexity: 0.4 }, rewards: { funds: 240, fame: 300 }, firstClearBonus: { funds: 250, fame: 700 }, desc: '市级专业比赛，高空、长持续和复杂特效占优。', preferenceDesc: '市级赛场比拼的是气势：打得高、开得大、颜色变幻丰富，再带上尾迹或频闪，评委才看得过瘾。', backdrop: { sky: 'midnight', ground: 'city', clouds: 'scattered' }, },
  e008: { id: 'e008', name: '音乐节暖场', type: 'activity', rank: 'technician', isMain: false, budget: null, minShells: 3, maxShells: 50, entryFee: 0, preferences: { height: 0.5, scale: 0.7, density: 0.7, duration: 0.5, color: { red: 0.2, gold: 0.2, blue: 0.2, green: 0.2, white: 0.2 }, effects: { strobe: 0.6 }, complexity: 0.2 }, rewards: { funds: 350, fame: 80 }, firstClearBonus: { funds: 0, fame: 0 }, desc: '音乐节需要多色、闪烁、星环类活跃气氛。', preferenceDesc: '音乐节要的是节奏感：五颜六色的花火跟着鼓点频闪，越躁越好。', backdrop: { sky: 'twilight', ground: 'city', clouds: 'few' }, },
  e009: { id: 'e009', name: '公园周末秀', type: 'repeatable', rank: 'technician', isMain: false, budget: 300, minShells: 3, maxShells: 8, entryFee: 0, preferences: { height: 0.5, scale: 0.5, density: 0.5, duration: 0.5, color: {}, effects: {}, complexity: 0, any: 8 }, rewards: { funds: 240, fame: 80 }, firstClearBonus: { funds: 0, fame: 0 }, desc: '周末公园常规表演，轻松稳定。', preferenceDesc: '周末公园秀就是图个稳：别出错、别超预算，观众开心，钱包也开心。', backdrop: { sky: 'clear', ground: 'park', clouds: 'few' }, },

  // Expert
  e010: { id: 'e010', name: '省级锦标赛', type: 'competition', rank: 'expert', isMain: true, budget: 900, roundBudget: 450, minShells: 5, maxShells: 12, entryFee: 0, preferences: { height: 0.85, scale: 0.9, density: 0.8, duration: 0.8, color: { gold: 0.5, silver: 0.5 }, effects: { bouquet: 0.5 }, complexity: 0.4 }, rewards: { funds: 500, fame: 600 }, firstClearBonus: { funds: 600, fame: 2500 }, desc: '省级大赛，千轮、棕榈、金银色系是高分关键。', preferenceDesc: '省级舞台讲究富贵堂皇：高空炸出层层叠叠的金银大花，像千轮绽放，才是冠军相。', backdrop: { sky: 'midnight', ground: 'city', clouds: 'few' }, },
  e011: { id: 'e011', name: '度假村周年庆', type: 'activity', rank: 'expert', isMain: false, budget: null, minShells: 4, maxShells: 60, entryFee: 0, preferences: { height: 0.7, scale: 0.8, density: 0.7, duration: 0.9, color: { red: 0.2, gold: 0.2, blue: 0.2, green: 0.2, white: 0.2 }, effects: {}, complexity: 0.3 }, rewards: { funds: 700, fame: 150 }, firstClearBonus: { funds: 0, fame: 0 }, desc: '度假村大型庆典，多彩长持续瀑布柳最受欢迎。', preferenceDesc: '度假村周年庆要的是场面：多彩的大花持续绽放，柳枝般垂落，像一幅流动的画。', backdrop: { sky: 'twilight', ground: 'park', clouds: 'scattered' }, },
  e012: { id: 'e012', name: '商业汇演', type: 'repeatable', rank: 'expert', isMain: false, budget: 800, minShells: 4, maxShells: 10, entryFee: 0, preferences: { height: 0.5, scale: 0.5, density: 0.5, duration: 0.5, color: {}, effects: {}, complexity: 0, any: 10 }, rewards: { funds: 600, fame: 180 }, firstClearBonus: { funds: 0, fame: 0 }, desc: '商业演出机会，收益稳定。', preferenceDesc: '商业汇演看的是性价比：控制在预算内，稳定发挥，甲方满意最重要。', backdrop: { sky: 'clear', ground: 'city', clouds: 'few' }, },

  // Master
  e013: { id: 'e013', name: '国际烟花邀请赛', type: 'competition', rank: 'master', isMain: true, budget: 2000, roundBudget: 900, minShells: 6, maxShells: 16, entryFee: 0, preferences: { height: 0.95, scale: 1.0, density: 0.9, duration: 0.9, color: { red: 0.2, gold: 0.2, blue: 0.2, white: 0.2, purple: 0.2 }, effects: { glitter: 0.2, crackle: 0.2, tail: 0.2, strobe: 0.2, bouquet: 0.2 }, complexity: 0.6 }, rewards: { funds: 1000, fame: 1500 }, firstClearBonus: { funds: 2000, fame: 3000 }, desc: '国际顶尖赛事，要求全能均衡，特效复杂。', preferenceDesc: '国际邀请赛是顶尖高手的对决：极限高度、超大尺寸、五色缤纷，各种特效轮番上阵，缺一厘都拿不到高分。', backdrop: { sky: 'midnight', ground: 'city', clouds: 'scattered' }, },
  e014: { id: 'e014', name: '大师告别演出', type: 'activity', rank: 'master', isMain: false, budget: null, minShells: 5, maxShells: 80, entryFee: 0, preferences: { height: 0.8, scale: 0.8, density: 0.7, duration: 0.9, color: { red: 0.5, gold: 0.5 }, effects: {}, complexity: 0.2 }, rewards: { funds: 1500, fame: 300 }, firstClearBonus: { funds: 0, fame: 0 }, desc: '大师级私人订制，红金长持续爱心为主题。', preferenceDesc: '这位大师想为自己的生涯画个圆满句号：红金交织的长持续爱心，饱满、深情、久久不散。', backdrop: { sky: 'twilight', ground: 'park', clouds: 'few' }, },
  e015: { id: 'e015', name: '顶级私人订制', type: 'repeatable', rank: 'master', isMain: false, budget: 1500, minShells: 5, maxShells: 12, entryFee: 0, preferences: { height: 0.5, scale: 0.5, density: 0.5, duration: 0.5, color: {}, effects: {}, complexity: 0, any: 12 }, rewards: { funds: 1000, fame: 250 }, firstClearBonus: { funds: 0, fame: 0 }, desc: '为富豪客户定制表演，报酬丰厚。', preferenceDesc: '富豪客户只要求一点：钱不是问题，场面一定要够大、够震撼，让他们觉得值回票价。', backdrop: { sky: 'midnight', ground: 'city', clouds: 'none' }, },
};

export const COMBO_RULES = [
  { id: 'newYear', name: '年味', bonus: 0.08, check(shells) {
    const red = shells.filter(s => (s.color.red || 0) > 0.5).length;
    const gold = shells.filter(s => (s.color.gold || 0) > 0.5).length;
    const crackle = shells.filter(s => s.effects.crackle).length;
    return red >= 2 && gold >= 2 && crackle >= 1;
  }},
  { id: 'romantic', name: '浪漫', bonus: 0.08, check(shells) {
    const pink = shells.filter(s => (s.color.pink || 0) > 0.5).length;
    const heart = shells.filter(s => s.shape === 'heart').length;
    return pink >= 2 && heart >= 2 && shells.every(s => s.height <= 0.5);
  }},
  { id: 'finale', name: '压轴', bonus: 0.10, check(shells) {
    if (shells.length < 3) return false;
    const last3 = shells.slice(-3);
    return last3.every(s => s.height >= 0.7 && s.duration >= 0.7);
  }},
  { id: 'colorful', name: '多彩', bonus: 0.05, check(shells) {
    const dominantColors = new Set();
    for (const s of shells) {
      const dominant = Object.entries(s.color).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (dominant) dominantColors.add(dominant);
    }
    return dominantColors.size >= 5;
  }},
  { id: 'rhythm', name: '节奏', bonus: 0.05, check(shells) {
    const shortCount = shells.filter(s => s.duration < 0.35).length;
    const mediumCount = shells.filter(s => s.duration >= 0.35 && s.duration < 0.7).length;
    const longCount = shells.filter(s => s.duration >= 0.7).length;
    return shortCount >= 1 && mediumCount >= 1 && longCount >= 1;
  }},
];

export const MAX_THRUST = 12; // normalization constant for height/scale formulas
export const MAX_DURATION_VALUE = 12; // normalization constant for duration formula

export const STARTING_FUNDS = 800;
export const STARTING_FAME = 0;
export const STARTING_RANK = 'apprentice';
export const STARTING_RECIPES = ['r001', 'r002', 'r003'];
export const STARTING_COMPONENTS = [
  'g001', 'g002',
  'c001', 'c002',
  'col001', 'col002', 'col003', 'col004', 'col005',
  'f001', 'f002',
  'e001', 'e002',
];

export const DISPLAY_LABELS = {
  height: { low: '低', mid: '中', high: '高' },
  shape: {
    peony: '牡丹',
    chrysanthemum: '菊花',
    willow: '柳',
    ring: '环',
    heart: '心',
    star: '星',
    palm: '棕榈',
  },
  duration: { short: '短', medium: '中', long: '长' },
  effect: {
    none: '无',
    glitter: '闪光',
    crackle: '爆响',
    tail: '尾迹',
    strobe: '频闪',
    bouquet: '花束',
  },
  color: {
    red: '红',
    gold: '金',
    blue: '蓝',
    green: '绿',
    white: '白',
    purple: '紫',
    pink: '粉',
    silver: '银',
    multi: '混色',
  },
};
