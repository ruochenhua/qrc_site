export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export const SEASONS = {
  spring: { name: '🌸 春季', weatherFreq: 0.20, staminaMult: 1.0, materialMult: 1.0, foodCostMult: 1.0, lodgingCostMult: 1.0, desc: '最稳妥的季节，天气温和，适合新手。' },
  summer: { name: '☀️ 夏季', weatherFreq: 0.40, staminaMult: 1.3, materialMult: 1.5, foodCostMult: 1.0, lodgingCostMult: 1.0, desc: '雨季频发，体力压力大，但素材爆炸。' },
  autumn: { name: '🍂 秋季', weatherFreq: 0.10, staminaMult: 0.9, materialMult: 1.5, foodCostMult: 1.0, lodgingCostMult: 2.0, desc: '金秋风景绝美，黄金周住宿翻倍，人设暴露风险。' },
  winter: { name: '❄️ 冬季', weatherFreq: 0.30, staminaMult: 1.5, materialMult: 2.0, foodCostMult: 1.5, lodgingCostMult: 1.0, desc: '地狱模式，存活即封神。' },
};

export const WEATHER_TYPES = {
  mild:            { name: '晴好', staminaMult: 1.0, materialMult: 1.0, dangerMult: 1.0, text: '' },
  light_rain:      { name: '小雨', staminaMult: 1.1, materialMult: 1.1, dangerMult: 1.1, text: '细雨中，视线有些模糊。' },
  fog:             { name: '浓雾', staminaMult: 1.15, materialMult: 1.2, dangerMult: 1.2, text: '浓雾弥漫，能见度极低。' },
  tailwind:        { name: '顺风', staminaMult: 0.9, materialMult: 1.0, dangerMult: 1.0, text: '顺风骑行，格外轻松。' },
  heavy_rain:      { name: '暴雨', staminaMult: 1.3, materialMult: 1.5, dangerMult: 1.3, text: '暴雨如注，泥水溅了满身。' },
  landslide_warning: { name: '塌方预警', staminaMult: 1.2, materialMult: 1.3, dangerMult: 1.5, text: '前方路段塌方预警，碎石滚落。' },
  heatwave:        { name: '高温', staminaMult: 1.2, materialMult: 1.0, dangerMult: 1.1, text: '烈日灼人，柏油路面发烫。' },
  thunderstorm:    { name: '雷暴', staminaMult: 1.4, materialMult: 1.6, dangerMult: 1.4, text: '电闪雷鸣，雨点像子弹般砸下。' },
  rainbow:         { name: '彩虹', staminaMult: 1.0, materialMult: 1.8, dangerMult: 1.0, text: '雨后彩虹横跨山谷，美得不可思议。' },
  golden:          { name: '金秋', staminaMult: 0.9, materialMult: 1.5, dangerMult: 1.0, text: '秋高气爽，层林尽染。' },
  crisp:           { name: '清冽', staminaMult: 1.0, materialMult: 1.3, dangerMult: 1.0, text: '空气清冽，呼吸间带着寒意。' },
  golden_week_crowd: { name: '黄金周', staminaMult: 1.0, materialMult: 1.2, dangerMult: 1.2, text: '黄金周人流如织，路上挤满了游客。' },
  early_snow:      { name: '初雪', staminaMult: 1.2, materialMult: 1.4, dangerMult: 1.2, text: '初雪降临，大地披上了银装。' },
  blizzard:        { name: '暴雪', staminaMult: 1.5, materialMult: 2.0, dangerMult: 1.5, text: '暴雪封山，狂风卷着雪粒打在脸上。' },
  black_ice:       { name: '暗冰', staminaMult: 1.3, materialMult: 1.5, dangerMult: 1.4, text: '路面覆盖着一层薄冰，车轮直打滑。' },
  extreme_cold:    { name: '极寒', staminaMult: 1.5, materialMult: 1.8, dangerMult: 1.3, text: '极寒刺骨，睫毛上结满了霜花。' },
  avalanche_risk:  { name: '雪崩预警', staminaMult: 1.4, materialMult: 1.7, dangerMult: 1.6, text: '雪崩预警！远处的积雪看起来很不稳定。' },
};

export const SEASON_WEATHER = {
  spring: ['light_rain', 'fog', 'tailwind', 'mild'],
  summer: ['heavy_rain', 'landslide_warning', 'heatwave', 'thunderstorm', 'rainbow'],
  autumn: ['golden', 'crisp', 'golden_week_crowd', 'early_snow'],
  winter: ['blizzard', 'black_ice', 'extreme_cold', 'avalanche_risk'],
};

export function rollDailyWeather(season) {
  const pool = SEASON_WEATHER[season];
  const freq = SEASONS[season].weatherFreq;
  if (Math.random() < freq) {
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return 'mild';
}

export function getWeatherNarrative(weather) {
  return WEATHER_TYPES[weather].text;
}

export const ROUTES = {
  short: [
    { id: 'chengdu', name: '成都', type: 'city', km: 0, desc: '天府之国，西行起点。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 20, weight: 1, desc: '恢复体力+5' },
        { id: 'repairKit', name: '修车工具', price: 100, weight: 2, desc: '爆胎时自行修理' },
      ]},
      accommodations: [
        { id: 'budget', name: '青年旅舍', price: 50, energyMult: 1.2, conMult: 1.0, sanBonus: 2 },
        { id: 'standard', name: '商务宾馆', price: 120, energyMult: 1.5, conMult: 1.3, sanBonus: 5 },
        { id: 'luxury', name: '温泉酒店', price: 280, energyMult: 2.0, conMult: 1.8, sanBonus: 10 },
      ],
      attractions: [
        { name: '宽窄巷子', time: 0.5, effects: [{ key: 'materials', delta: 3 }, { key: 'san', delta: 2 }], desc: '老成都的烟火气，素材不错。' },
      ]
    },
    { id: 'qionglai', name: '邛崃镇', type: 'town', km: 60, desc: '小县城，有基础补给。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 22, weight: 1, desc: '恢复体力+5' },
        { id: 'repairKit', name: '修车工具', price: 110, weight: 2, desc: '爆胎时自行修理' },
      ]},
      accommodations: [
        { id: 'budget', name: '路边客栈', price: 40, energyMult: 1.1, conMult: 1.0, sanBonus: 1 },
      ],
      attractions: []
    },
    { id: 'yaan', name: '雅安', type: 'city', km: 140, desc: '雨城，川藏线的门户。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 20, weight: 1, desc: '恢复体力+5' },
        { id: 'oxygen', name: '便携氧气瓶', price: 80, weight: 2, desc: '高海拔体力恢复+50%' },
        { id: 'repairKit', name: '修车工具', price: 100, weight: 2, desc: '爆胎时自行修理' },
      ]},
      accommodations: [
        { id: 'budget', name: '青年旅舍', price: 50, energyMult: 1.2, conMult: 1.0, sanBonus: 2 },
        { id: 'standard', name: '商务宾馆', price: 120, energyMult: 1.5, conMult: 1.3, sanBonus: 5 },
        { id: 'luxury', name: '温泉酒店', price: 260, energyMult: 2.0, conMult: 1.8, sanBonus: 10 },
      ],
      attractions: [
        { name: '青衣江漫步', time: 0.5, effects: [{ key: 'materials', delta: 5 }, { key: 'san', delta: 3 }], desc: '江边晨雾缭绕，如同水墨画。' },
        { name: '碧峰峡熊猫基地', time: 1.5, effects: [{ key: 'materials', delta: 12 }, { key: 'san', delta: 8 }], desc: '近距离拍摄大熊猫，萌翻了！' },
      ]
    },
    { id: 'tianquan', name: '天全镇', type: 'town', km: 190, desc: '川藏线上的小驿站。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 22, weight: 1, desc: '恢复体力+5' },
      ]},
      accommodations: [
        { id: 'budget', name: '路边客栈', price: 35, energyMult: 1.1, conMult: 1.0, sanBonus: 1 },
      ],
      attractions: [
        { name: '二郎山脚下的茶园', time: 0.5, effects: [{ key: 'materials', delta: 4 }, { key: 'san', delta: 3 }], desc: '云雾茶园，空气清新。' },
      ]
    },
    { id: 'erlangshan', name: '二郎山隧道口', type: 'outpost', km: 260, desc: '隧道口小卖部，高海拔前最后补给。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 30, weight: 1, desc: '恢复体力+5' },
      ]},
      accommodations: [
        { id: 'budget', name: '隧道口工棚', price: 30, energyMult: 0.9, conMult: 0.8, sanBonus: 0 },
      ],
      attractions: [
        { name: '云海延时拍摄', time: 0.5, effects: [{ key: 'materials', delta: 10 }, { key: 'san', delta: 6 }], desc: '云海如潮水般涌动，震撼人心。' },
      ]
    },
    { id: 'luding', name: '泸定', type: 'city', km: 340, desc: '大渡河畔，红军飞夺泸定桥之地。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 22, weight: 1, desc: '恢复体力+5' },
        { id: 'oxygen', name: '便携氧气瓶', price: 85, weight: 2, desc: '高海拔体力恢复+50%' },
      ]},
      accommodations: [
        { id: 'budget', name: '青年旅舍', price: 45, energyMult: 1.2, conMult: 1.0, sanBonus: 2 },
        { id: 'standard', name: '商务宾馆', price: 100, energyMult: 1.5, conMult: 1.3, sanBonus: 5 },
      ],
      attractions: [
        { name: '泸定桥', time: 0.5, effects: [{ key: 'materials', delta: 6 }, { key: 'san', delta: 4 }], desc: '铁索寒光，历史的厚重感扑面而来。' },
      ]
    },
    { id: 'zheduoshan', name: '折多山垭口', type: 'wild_poi', km: 400, desc: '海拔4298米，"康巴第一关"。',
      attractions: [
        { name: '征服折多山', time: 1, effects: [{ key: 'materials', delta: 15 }, { key: 'san', delta: 8 }], desc: '站在垭口，风雪呼啸，你感到前所未有的渺小。' },
      ]
    },
    { id: 'xinduqiao', name: '新都桥', type: 'town', km: 430, desc: '摄影天堂，光与影的世界。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 25, weight: 1, desc: '恢复体力+5' },
      ]},
      accommodations: [
        { id: 'budget', name: '藏家客栈', price: 50, energyMult: 1.1, conMult: 1.0, sanBonus: 2 },
      ],
      attractions: [
        { name: '摄影天堂', time: 1.5, effects: [{ key: 'materials', delta: 20 }, { key: 'san', delta: 10 }], desc: '每一帧都是大片，光线完美。' },
      ]
    },
  ],
  long: [
    { id: 'chengdu', name: '成都', type: 'city', km: 0, desc: '天府之国，西行起点。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 20, weight: 1, desc: '恢复体力+5' },
        { id: 'repairKit', name: '修车工具', price: 100, weight: 2, desc: '爆胎时自行修理' },
      ]},
      accommodations: [
        { id: 'budget', name: '青年旅舍', price: 50, energyMult: 1.2, conMult: 1.0, sanBonus: 2 },
        { id: 'standard', name: '商务宾馆', price: 120, energyMult: 1.5, conMult: 1.3, sanBonus: 5 },
        { id: 'luxury', name: '温泉酒店', price: 280, energyMult: 2.0, conMult: 1.8, sanBonus: 10 },
      ],
      attractions: [
        { name: '宽窄巷子', time: 0.5, effects: [{ key: 'materials', delta: 3 }, { key: 'san', delta: 2 }], desc: '老成都的烟火气，素材不错。' },
      ]
    },
    { id: 'qionglai', name: '邛崃镇', type: 'town', km: 60, desc: '小县城，有基础补给。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 22, weight: 1, desc: '恢复体力+5' },
        { id: 'repairKit', name: '修车工具', price: 110, weight: 2, desc: '爆胎时自行修理' },
      ]},
      accommodations: [
        { id: 'budget', name: '路边客栈', price: 40, energyMult: 1.1, conMult: 1.0, sanBonus: 1 },
      ],
      attractions: []
    },
    { id: 'yaan', name: '雅安', type: 'city', km: 140, desc: '雨城，川藏线的门户。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 20, weight: 1, desc: '恢复体力+5' },
        { id: 'oxygen', name: '便携氧气瓶', price: 80, weight: 2, desc: '高海拔体力恢复+50%' },
        { id: 'repairKit', name: '修车工具', price: 100, weight: 2, desc: '爆胎时自行修理' },
      ]},
      accommodations: [
        { id: 'budget', name: '青年旅舍', price: 50, energyMult: 1.2, conMult: 1.0, sanBonus: 2 },
        { id: 'standard', name: '商务宾馆', price: 120, energyMult: 1.5, conMult: 1.3, sanBonus: 5 },
        { id: 'luxury', name: '温泉酒店', price: 260, energyMult: 2.0, conMult: 1.8, sanBonus: 10 },
      ],
      attractions: [
        { name: '青衣江漫步', time: 0.5, effects: [{ key: 'materials', delta: 5 }, { key: 'san', delta: 3 }], desc: '江边晨雾缭绕，如同水墨画。' },
        { name: '碧峰峡熊猫基地', time: 1.5, effects: [{ key: 'materials', delta: 12 }, { key: 'san', delta: 8 }], desc: '近距离拍摄大熊猫，萌翻了！' },
      ]
    },
    { id: 'tianquan', name: '天全镇', type: 'town', km: 190, desc: '川藏线上的小驿站。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 22, weight: 1, desc: '恢复体力+5' },
      ]},
      accommodations: [
        { id: 'budget', name: '路边客栈', price: 35, energyMult: 1.1, conMult: 1.0, sanBonus: 1 },
      ],
      attractions: [
        { name: '二郎山脚下的茶园', time: 0.5, effects: [{ key: 'materials', delta: 4 }, { key: 'san', delta: 3 }], desc: '云雾茶园，空气清新。' },
      ]
    },
    { id: 'erlangshan', name: '二郎山隧道口', type: 'outpost', km: 260, desc: '隧道口小卖部，高海拔前最后补给。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 30, weight: 1, desc: '恢复体力+5' },
      ]},
      accommodations: [
        { id: 'budget', name: '隧道口工棚', price: 30, energyMult: 0.9, conMult: 0.8, sanBonus: 0 },
      ],
      attractions: [
        { name: '云海延时拍摄', time: 0.5, effects: [{ key: 'materials', delta: 10 }, { key: 'san', delta: 6 }], desc: '云海如潮水般涌动，震撼人心。' },
      ]
    },
    { id: 'luding', name: '泸定', type: 'city', km: 340, desc: '大渡河畔，红军飞夺泸定桥之地。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 22, weight: 1, desc: '恢复体力+5' },
        { id: 'oxygen', name: '便携氧气瓶', price: 85, weight: 2, desc: '高海拔体力恢复+50%' },
      ]},
      accommodations: [
        { id: 'budget', name: '青年旅舍', price: 45, energyMult: 1.2, conMult: 1.0, sanBonus: 2 },
        { id: 'standard', name: '商务宾馆', price: 100, energyMult: 1.5, conMult: 1.3, sanBonus: 5 },
      ],
      attractions: [
        { name: '泸定桥', time: 0.5, effects: [{ key: 'materials', delta: 6 }, { key: 'san', delta: 4 }], desc: '铁索寒光，历史的厚重感扑面而来。' },
      ]
    },
    { id: 'kangding', name: '康定', type: 'city', km: 450, desc: '跑马溜溜的山上，海拔2560米。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 25, weight: 1, desc: '恢复体力+5' },
        { id: 'oxygen', name: '便携氧气瓶', price: 90, weight: 2, desc: '高海拔体力恢复+50%' },
        { id: 'repairKit', name: '修车工具', price: 110, weight: 2, desc: '爆胎时自行修理' },
      ]},
      accommodations: [
        { id: 'budget', name: '青年旅舍', price: 55, energyMult: 1.2, conMult: 1.0, sanBonus: 2 },
        { id: 'standard', name: '商务宾馆', price: 130, energyMult: 1.5, conMult: 1.3, sanBonus: 5 },
        { id: 'luxury', name: '藏式温泉酒店', price: 300, energyMult: 2.0, conMult: 1.8, sanBonus: 10 },
      ],
      attractions: [
        { name: '跑马山观景台', time: 0.5, effects: [{ key: 'materials', delta: 5 }, { key: 'san', delta: 3 }], desc: '俯瞰康定城，雪山为背景。' },
        { name: '康定情歌广场', time: 1, effects: [{ key: 'materials', delta: 8 }, { key: 'san', delta: 5 }], desc: '当地人跳锅庄舞，氛围热烈。' },
      ]
    },
    { id: 'zheduoshan', name: '折多山垭口', type: 'wild_poi', km: 520, desc: '海拔4298米，"康巴第一关"。',
      attractions: [
        { name: '征服折多山', time: 1, effects: [{ key: 'materials', delta: 15 }, { key: 'san', delta: 8 }], desc: '站在垭口，风雪呼啸，你感到前所未有的渺小。' },
      ]
    },
    { id: 'xinduqiao', name: '新都桥', type: 'town', km: 560, desc: '摄影天堂，光与影的世界。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 25, weight: 1, desc: '恢复体力+5' },
      ]},
      accommodations: [
        { id: 'budget', name: '藏家客栈', price: 50, energyMult: 1.1, conMult: 1.0, sanBonus: 2 },
      ],
      attractions: [
        { name: '摄影天堂', time: 1.5, effects: [{ key: 'materials', delta: 20 }, { key: 'san', delta: 10 }], desc: '每一帧都是大片，光线完美。' },
      ]
    },
    { id: 'yajiang', name: '雅江', type: 'town', km: 640, desc: '悬崖上的县城，松茸之乡。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 28, weight: 1, desc: '恢复体力+5' },
      ]},
      accommodations: [
        { id: 'budget', name: '藏民家庭旅馆', price: 40, energyMult: 1.1, conMult: 1.0, sanBonus: 2 },
      ],
      attractions: [
        { name: '雅砻江大峡谷', time: 1, effects: [{ key: 'materials', delta: 10 }, { key: 'san', delta: 6 }], desc: '峡谷深邃，江水奔流。' },
      ]
    },
    { id: 'kazilashan', name: '卡子拉山垭口', type: 'wild_poi', km: 720, desc: '海拔4718米，天空触手可及。',
      attractions: [
        { name: '天路十八弯', time: 1, effects: [{ key: 'materials', delta: 18 }, { key: 'san', delta: 10 }], desc: '云海在脚下翻滚，宛如仙境。' },
      ]
    },
    { id: 'litang', name: '理塘', type: 'city', km: 790, desc: '世界高城，海拔4014米。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 30, weight: 1, desc: '恢复体力+5' },
        { id: 'oxygen', name: '便携氧气瓶', price: 100, weight: 2, desc: '高海拔体力恢复+50%' },
      ]},
      accommodations: [
        { id: 'budget', name: '青年旅舍', price: 60, energyMult: 1.2, conMult: 1.0, sanBonus: 2 },
        { id: 'standard', name: '供氧宾馆', price: 180, energyMult: 1.5, conMult: 1.3, sanBonus: 8 },
      ],
      attractions: [
        { name: '长青春科尔寺', time: 1, effects: [{ key: 'materials', delta: 8 }, { key: 'san', delta: 6 }], desc: '藏传佛教圣地，心灵宁静。' },
        { name: '勒通古镇', time: 0.5, effects: [{ key: 'materials', delta: 5 }, { key: 'san', delta: 3 }], desc: '千户藏寨，丁真的家乡。' },
      ]
    },
    { id: 'haizishan', name: '海子山驿站', type: 'outpost', km: 850, desc: '荒原上唯一的补给点，冬季关键。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 40, weight: 1, desc: '恢复体力+5' },
      ]},
      accommodations: [
        { id: 'budget', name: '藏民帐篷', price: 35, energyMult: 0.8, conMult: 0.7, sanBonus: 0 },
      ],
      attractions: []
    },
    { id: 'batang', name: '巴塘', type: 'city', km: 980, desc: '弦子之乡，入藏前最后一站。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 28, weight: 1, desc: '恢复体力+5' },
        { id: 'oxygen', name: '便携氧气瓶', price: 95, weight: 2, desc: '高海拔体力恢复+50%' },
        { id: 'repairKit', name: '修车工具', price: 120, weight: 2, desc: '爆胎时自行修理' },
      ]},
      accommodations: [
        { id: 'budget', name: '青年旅舍', price: 50, energyMult: 1.2, conMult: 1.0, sanBonus: 2 },
        { id: 'standard', name: '商务宾馆', price: 140, energyMult: 1.5, conMult: 1.3, sanBonus: 5 },
        { id: 'luxury', name: '江景度假酒店', price: 320, energyMult: 2.0, conMult: 1.8, sanBonus: 10 },
      ],
      attractions: [
        { name: '金沙江大拐弯', time: 1, effects: [{ key: 'materials', delta: 10 }, { key: 'san', delta: 6 }], desc: '金沙江在这里拐了一个大弯。' },
      ]
    },
    { id: 'zhubalong', name: '金沙江大桥', type: 'outpost', km: 1060, desc: '川藏界碑，桥头小卖部。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 35, weight: 1, desc: '恢复体力+5' },
      ]},
      accommodations: [
        { id: 'budget', name: '桥边帐篷', price: 30, energyMult: 0.8, conMult: 0.7, sanBonus: 0 },
      ],
      attractions: []
    },
    { id: 'mangkang', name: '芒康', type: 'town', km: 1140, desc: '进藏第一镇。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 30, weight: 1, desc: '恢复体力+5' },
      ]},
      accommodations: [
        { id: 'budget', name: '路边招待所', price: 45, energyMult: 1.1, conMult: 1.0, sanBonus: 1 },
      ],
      attractions: [
        { name: '盐井古盐田', time: 1, effects: [{ key: 'materials', delta: 8 }, { key: 'san', delta: 5 }], desc: '千年古盐田，阳光下晶莹剔透。' },
      ]
    },
    { id: 'rumi', name: '如美镇', type: 'outpost', km: 1220, desc: '澜沧江边的小驿站。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 35, weight: 1, desc: '恢复体力+5' },
      ]},
      accommodations: [
        { id: 'budget', name: '江边工棚', price: 30, energyMult: 0.9, conMult: 0.8, sanBonus: 0 },
      ],
      attractions: []
    },
    { id: 'juebashan', name: '觉巴山', type: 'wild_poi', km: 1300, desc: '318最险路段之一。',
      attractions: [
        { name: '悬崖公路航拍', time: 1, effects: [{ key: 'materials', delta: 18 }, { key: 'san', delta: 8 }], desc: '一侧是绝壁，一侧是深渊，肾上腺素飙升。' },
      ]
    },
    { id: 'dongdashan', name: '东达山垭口', type: 'wild_poi', km: 1380, desc: '海拔5130米，全程最高。',
      attractions: [
        { name: '生命禁区打卡', time: 1, effects: [{ key: 'materials', delta: 20 }, { key: 'san', delta: 10 }], desc: '在世界最高公路垭口，你感到呼吸困难但内心澎湃。' },
      ]
    },
    { id: 'zuogong', name: '左贡', type: 'town', km: 1460, desc: '山谷小城。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 32, weight: 1, desc: '恢复体力+5' },
      ]},
      accommodations: [
        { id: 'budget', name: '县城客栈', price: 40, energyMult: 1.1, conMult: 1.0, sanBonus: 1 },
      ],
      attractions: []
    },
    { id: 'bangda', name: '邦达', type: 'outpost', km: 1540, desc: '三江并流区，兵站旁的小卖部。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 38, weight: 1, desc: '恢复体力+5' },
      ]},
      accommodations: [
        { id: 'budget', name: '兵站招待所', price: 35, energyMult: 0.9, conMult: 0.8, sanBonus: 1 },
      ],
      attractions: []
    },
    { id: 'nujiang', name: '怒江72拐', type: 'wild_poi', km: 1620, desc: '史诗级下坡。',
      attractions: [
        { name: '72拐第一视角', time: 1, effects: [{ key: 'materials', delta: 20 }, { key: 'san', delta: 12 }], desc: '180度急弯一个接一个，镜头记录下这惊心动魄的时刻。' },
      ]
    },
    { id: 'basu', name: '八宿', type: 'town', km: 1700, desc: '怒江峡谷中的小城。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 32, weight: 1, desc: '恢复体力+5' },
      ]},
      accommodations: [
        { id: 'budget', name: '峡谷客栈', price: 45, energyMult: 1.1, conMult: 1.0, sanBonus: 1 },
      ],
      attractions: []
    },
    { id: 'ranwu', name: '然乌', type: 'town', km: 1820, desc: '然乌湖畔，风景绝美。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 35, weight: 1, desc: '恢复体力+5' },
      ]},
      accommodations: [
        { id: 'budget', name: '湖边客栈', price: 55, energyMult: 1.2, conMult: 1.0, sanBonus: 3 },
      ],
      attractions: [
        { name: '然乌湖日出', time: 1.5, effects: [{ key: 'materials', delta: 18 }, { key: 'san', delta: 12 }], desc: '湖面如镜，倒映着雪山，美得令人窒息。' },
      ]
    },
    { id: 'tongmai', name: '通麦', type: 'outpost', km: 1940, desc: '原"通麦天险"，价格翻倍。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 50, weight: 1, desc: '恢复体力+5' },
      ]},
      accommodations: [
        { id: 'budget', name: '工棚', price: 45, energyMult: 0.8, conMult: 0.7, sanBonus: 0 },
      ],
      attractions: []
    },
    { id: 'linzhi', name: '林芝', type: 'city', km: 2100, desc: '西藏江南。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 30, weight: 1, desc: '恢复体力+5' },
        { id: 'oxygen', name: '便携氧气瓶', price: 90, weight: 2, desc: '高海拔体力恢复+50%' },
      ]},
      accommodations: [
        { id: 'budget', name: '青年旅舍', price: 55, energyMult: 1.2, conMult: 1.0, sanBonus: 2 },
        { id: 'standard', name: '商务宾馆', price: 150, energyMult: 1.5, conMult: 1.3, sanBonus: 5 },
        { id: 'luxury', name: '度假村', price: 350, energyMult: 2.0, conMult: 1.8, sanBonus: 10 },
      ],
      attractions: [
        { name: '尼洋河风光', time: 1, effects: [{ key: 'materials', delta: 12 }, { key: 'san', delta: 8 }], desc: '西藏江南，绿意盎然。' },
      ]
    },
    { id: 'lhasa', name: '拉萨', type: 'city', km: 2300, desc: '圣城拉萨，布达拉宫在阳光下闪耀。',
      shop: { items: [
        { id: 'food', name: '压缩口粮', price: 35, weight: 1, desc: '恢复体力+5' },
        { id: 'oxygen', name: '便携氧气瓶', price: 110, weight: 2, desc: '高海拔体力恢复+50%' },
      ]},
      accommodations: [
        { id: 'budget', name: '青年旅舍', price: 70, energyMult: 1.2, conMult: 1.0, sanBonus: 2 },
        { id: 'standard', name: '藏式客栈', price: 200, energyMult: 1.5, conMult: 1.3, sanBonus: 8 },
        { id: 'luxury', name: '布达拉宫景观酒店', price: 500, energyMult: 2.0, conMult: 1.8, sanBonus: 15 },
      ],
      attractions: [
        { name: '布达拉宫', time: 2, effects: [{ key: 'materials', delta: 15 }, { key: 'san', delta: 20 }], desc: '终点！雪域圣殿，信仰的力量。' },
        { name: '八廓街转经', time: 1, effects: [{ key: 'materials', delta: 8 }, { key: 'san', delta: 10 }], desc: '跟随朝圣者的脚步，心灵洗涤。' },
      ]
    },
  ],
};

export let ROUTE = ROUTES.short;
export function setRoute(name) { ROUTE = ROUTES[name]; }

export const TRAVEL_MODES = {
  normal: { name: '正常骑行', speed: 20, energyCost: 10, conCost: 5, time: 3 },
  rush: { name: '拼命赶路', speed: 35, energyCost: 20, conCost: 10, time: 3 },
};

export const ITEMS = {
  repairKit: { name: '修车工具', weight: 2 },
  food: { name: '口粮', weight: 1 },
  tent: { name: '帐篷', weight: 3 },
};

export const STARTING_ITEMS = {
  coder: [{ item: 'repairKit', count: 1 }, { item: 'food', count: 5 }],
  tough: [{ item: 'repairKit', count: 1 }, { item: 'food', count: 3 }],
};

export const EVENTS = [
  {
    id: 'flat_tire',
    phase: 'DAY',
    weight: 10,
    text: '爆胎了！轮胎被路上的碎石扎破，你被迫停在路边。{weather_text}',
    choices: [
      { type: 'safe', text: '🛡️ 自己修理（需修车工具，智力判定）', effects: [{ key: 'int_check', delta: 0.7 }, { key: 'materials', delta: 2 }, { key: 'time', delta: 2 }] },
      { type: 'safe', text: '🛡️ 打电话叫拖车（资金-500，时间+1h）', effects: [{ key: 'cny', delta: -500 }, { key: 'time', delta: 1 }, { key: 'km', delta: 40 }] },
      { type: 'adventure', text: '⚡ 咬牙推车前进，拍"爆胎独推30km"Vlog（体力-25，素材+15，B站粉丝+100，时间+3h）', effects: [{ key: 'con', delta: -25 }, { key: 'materials', delta: 15 }, { key: 'fans_bilibili', delta: 100 }, { key: 'time', delta: 3 }] },
      { type: 'blackred', text: '💀 假装轮胎被藏民"敲诈"换胎费，拍冲突视频（体力-5，Sin+10，抖音粉丝+300）', effects: [{ key: 'con', delta: -5 }, { key: 'sin', delta: 10 }, { key: 'fans_douyin', delta: 300 }, { key: 'msg', delta: 0, msg: '视频爆了！评论区有人质疑"这藏族大哥看起来不像坏人啊？"' }] },
    ]
  },
  {
    id: 'stranger_meet',
    phase: 'DAY',
    weight: 8,
    text: '路上遇到一位骑行老手，他看起来经验丰富。',
    choices: [
      { type: 'safe', text: '🛡️ 请教经验（智力+3，时间+0.5h）', effects: [{ key: 'int', delta: 3 }, { key: 'time', delta: 0.5 }] },
      { type: 'adventure', text: '⚡ 一起合影发视频（素材+5，B站粉丝+30，时间+0.5h）', effects: [{ key: 'materials', delta: 5 }, { key: 'fans_bilibili', delta: 30 }, { key: 'time', delta: 0.5 }] },
      { type: 'blackred', text: '💀 编造"偶遇骑行大神被嘲讽"剧本（Sin+8，抖音粉丝+150）', effects: [{ key: 'sin', delta: 8 }, { key: 'fans_douyin', delta: 150 }, { key: 'msg', delta: 0, msg: '评论区炸锅："这大佬说话好刻薄！"' }] },
    ]
  },
  {
    id: 'fake_script',
    phase: 'NIGHT',
    weight: 6,
    text: '今晚的内容没什么爆点。一个MCN朋友私信你："编个剧本吧，假装在无人区遇到狼群，流量直接起飞。"',
    choices: [
      { type: 'safe', text: '🛡️ 拒绝，坚持真实（精神+5）', effects: [{ key: 'san', delta: 5 }, { key: 'msg', delta: 0, msg: '你拒绝了。虽然流量一般，但心安理得。' }] },
      { type: 'blackred', text: '💀 接受，编造"狼群围攻"剧本（Sin+15，抖音粉丝+500）', effects: [{ key: 'sin', delta: 15 }, { key: 'fans_douyin', delta: 500 }, { key: 'msg', delta: 0, msg: '视频爆了！但评论区开始有人质疑："这狼看起来像是狗？"' }] },
    ]
  },
  {
    id: 'high_altitude_sickness',
    phase: 'DAY',
    weight: 7,
    text: '海拔超过3500米，你开始感到头痛、恶心——高原反应来了。',
    choices: [
      { type: 'safe', text: '🛡️ 吸氧休息（体力-5，精力-10，时间+2h，精神+3）', effects: [{ key: 'con', delta: -5 }, { key: 'energy', delta: -10 }, { key: 'time', delta: 2 }, { key: 'san', delta: 3 }] },
      { type: 'safe', text: '🛡️ 掉头返回低海拔（放弃当前节点，精神+5）', effects: [{ key: 'node', delta: -1 }, { key: 'km', delta: -30 }, { key: 'san', delta: 5 }] },
      { type: 'adventure', text: '⚡ 边高反边直播濒死状态（体力-25，精力-20，抖音粉丝+800，素材+10）', effects: [{ key: 'con', delta: -25 }, { key: 'energy', delta: -20 }, { key: 'fans_douyin', delta: 800 }, { key: 'materials', delta: 10 }] },
      { type: 'blackred', text: '💀 假装高反濒死骗打赏，发求救视频（体力-5，Sin+15，全平台粉丝+200，打赏+¥200）', effects: [{ key: 'con', delta: -5 }, { key: 'sin', delta: 15 }, { key: 'fans_bilibili', delta: 100 }, { key: 'fans_douyin', delta: 150 }, { key: 'fans_xiaohongshu', delta: 50 }, { key: 'cny', delta: 200 }] },
    ]
  },
  {
    id: 'landslide',
    phase: 'DAY',
    weight: 5,
    text: '前方路段发生塌方，碎石堵住了去路。',
    choices: [
      { type: 'safe', text: '🛡️ 等待清理（时间+3h）', effects: [{ key: 'time', delta: 3 }] },
      { type: 'adventure', text: '⚡ 冒险绕行塌方边缘（体力-15，推进20km，素材+8，时间+2h）', effects: [{ key: 'con', delta: -15 }, { key: 'km', delta: 20 }, { key: 'time', delta: 2 }, { key: 'materials', delta: 8 }] },
      { type: 'blackred', text: '💀 拍摄"我被塌方埋了"假视频（Sin+15，抖音粉丝+500，素材+5）', effects: [{ key: 'sin', delta: 15 }, { key: 'fans_douyin', delta: 500 }, { key: 'materials', delta: 5 }] },
    ]
  },
  {
    id: 'lost_wallet',
    phase: 'DAY',
    weight: 6,
    text: '你发现自己的钱包不见了！可能是掉在上一站了。',
    choices: [
      { type: 'safe', text: '🛡️ 原路返回寻找（时间+2h，资金-200）', effects: [{ key: 'time', delta: 2 }, { key: 'cny', delta: -200 }] },
      { type: 'safe', text: '🛡️ 发求助视频（素材+3，B站粉丝+20，打赏+¥50）', effects: [{ key: 'materials', delta: 3 }, { key: 'fans_bilibili', delta: 20 }, { key: 'cny', delta: 50 }, { key: 'msg', delta: 0, msg: '粉丝们纷纷安慰你，有人打赏了¥50。' }] },
      { type: 'blackred', text: '💀 编造"钱包被藏民偷走"剧本（Sin+12，抖音粉丝+400）', effects: [{ key: 'sin', delta: 12 }, { key: 'fans_douyin', delta: 400 }, { key: 'msg', delta: 0, msg: '评论区炸了："民族团结警告！"' }] },
    ]
  },
  {
    id: 'wild_animal',
    phase: 'DAY',
    weight: 4,
    text: '路边突然出现一只野狗，对着你狂吠！',
    choices: [
      { type: 'safe', text: '🛡️ 慢慢后退（安全，时间+0.5h）', effects: [{ key: 'time', delta: 0.5 }] },
      { type: 'adventure', text: '⚡ 凑近自拍发抖音（体力-15，素材+10，抖音粉丝+300）', effects: [{ key: 'con', delta: -15 }, { key: 'materials', delta: 10 }, { key: 'fans_douyin', delta: 300 }, { key: 'msg', delta: 0, msg: '野狗突然冲过来，你赶紧骑车逃跑，受了点轻伤。' }] },
      { type: 'blackred', text: '💀 用石头砸狗然后拍"无人区恶犬"视频（体力-5，Sin+10，抖音粉丝+400）', effects: [{ key: 'con', delta: -5 }, { key: 'sin', delta: 10 }, { key: 'fans_douyin', delta: 400 }, { key: 'msg', delta: 0, msg: '视频爆了！但爱狗人士正在赶来...' }] },
    ]
  },
  {
    id: 'local_festival',
    phase: 'DAY',
    weight: 5,
    text: '路过一个小镇，正好赶上当地的赛马节，热闹非凡。',
    choices: [
      { type: 'safe', text: '🛡️ 安静路过（时间+0）', effects: [{ key: 'time', delta: 0 }] },
      { type: 'adventure', text: '⚡ 参与拍摄（素材+10，时间+2h，精神+10）', effects: [{ key: 'materials', delta: 10 }, { key: 'time', delta: 2 }, { key: 'san', delta: 10 }] },
      { type: 'blackred', text: '💀 直播"赛马节翻车"假摔剧本（Sin+10，抖音粉丝+600）', effects: [{ key: 'sin', delta: 10 }, { key: 'fans_douyin', delta: 600 }, { key: 'energy', delta: -10 }] },
    ]
  },
  {
    id: 'good_weather',
    phase: 'DAY',
    weight: 15,
    text: '天气晴朗，风景绝佳，骑行心情大好。',
    choices: [
      { type: 'safe', text: '🛡️ 享受骑行（精神+5，素材+2）', effects: [{ key: 'san', delta: 5 }, { key: 'materials', delta: 2 }] },
      { type: 'adventure', text: '⚡ 边骑边航拍（精力-10，素材+5）', effects: [{ key: 'energy', delta: -10 }, { key: 'materials', delta: 5 }] },
    ]
  },
  {
    id: 'rain',
    phase: 'DAY',
    weight: 12,
    text: '突然下起大雨，路面湿滑，视线模糊。',
    choices: [
      { type: 'safe', text: '🛡️ 找地方避雨（时间+1h）', effects: [{ key: 'time', delta: 1 }] },
      { type: 'adventure', text: '⚡ 雨骑拍摄（体力-12，素材+8）', effects: [{ key: 'con', delta: -12 }, { key: 'materials', delta: 8 }] },
    ]
  },
  {
    id: 'tailwind',
    phase: 'DAY',
    weight: 10,
    text: '顺风！风从背后推着你，骑行格外轻松。',
    choices: [
      { type: 'safe', text: '🛡️ 正常骑行（推进20km）', effects: [{ key: 'km', delta: 20 }] },
      { type: 'adventure', text: '⚡ 加速冲刺（体力-5，推进+15km）', effects: [{ key: 'con', delta: -5 }, { key: 'km', delta: 15 }] },
    ]
  },
  {
    id: 'headwind',
    phase: 'DAY',
    weight: 10,
    text: '逆风骑行，每踩一圈都像在对抗整个世界。',
    choices: [
      { type: 'safe', text: '🛡️ 下车休息等风停（时间+0.5h）', effects: [{ key: 'time', delta: 0.5 }] },
      { type: 'adventure', text: '⚡ 咬牙硬骑（体力-15，推进正常20km）', effects: [{ key: 'con', delta: -15 }, { key: 'km', delta: 20 }] },
    ]
  },
  {
    id: 'beautiful_sunset',
    phase: 'EVENING',
    weight: 8,
    text: '夕阳西下，金色的光芒洒满山谷，美得让人窒息。',
    choices: [
      { type: 'safe', text: '🛡️ 静静欣赏（精神+8）', effects: [{ key: 'san', delta: 8 }] },
      { type: 'adventure', text: '⚡ 拍摄延时（素材+8，时间+0.5h）', effects: [{ key: 'materials', delta: 8 }, { key: 'time', delta: 0.5 }] },
    ]
  },
  {
    id: 'flat_road',
    phase: 'DAY',
    weight: 14,
    text: '一段平坦的柏油路，骑行轻松愉快。',
    choices: [
      { type: 'safe', text: '🛡️ 正常骑行（推进25km）', effects: [{ key: 'km', delta: 25 }] },
      { type: 'adventure', text: '⚡ 边骑边直播（精力-15，素材+3，抖音粉丝+50）', effects: [{ key: 'energy', delta: -15 }, { key: 'materials', delta: 3 }, { key: 'fans_douyin', delta: 50 }] },
    ]
  },
  {
    id: 'steep_climb',
    phase: 'DAY',
    weight: 12,
    text: '连续上坡，档位已经降到最低，腿像灌了铅。',
    choices: [
      { type: 'safe', text: '🛡️ 推车上去（体力-12，推进10km）', effects: [{ key: 'con', delta: -12 }, { key: 'km', delta: 10 }] },
      { type: 'adventure', text: '⚡ 咬牙骑上去拍爬坡视频（体力-25，素材+10，B站粉丝+50）', effects: [{ key: 'con', delta: -25 }, { key: 'materials', delta: 10 }, { key: 'fans_bilibili', delta: 50 }] },
    ]
  },
  {
    id: 'downhill',
    phase: 'DAY',
    weight: 10,
    text: '长下坡！风在耳边呼啸，速度飞快。',
    choices: [
      { type: 'safe', text: '🛡️ 控制速度（推进20km）', effects: [{ key: 'km', delta: 20 }] },
      { type: 'adventure', text: '⚡ 放坡速降拍第一视角（体力-5，素材+8，有概率摔车）', effects: [{ key: 'con', delta: -5 }, { key: 'materials', delta: 8 }] },
    ]
  },
  {
    id: 'starving',
    phase: 'DAY',
    weight: 8,
    text: '肚子咕咕叫，附近没有餐馆。',
    choices: [
      { type: 'safe', text: '🛡️ 吃干粮（体力+5）', effects: [{ key: 'con', delta: 5 }, { key: 'msg', delta: 0, msg: '你吃了点干粮，勉强填饱肚子，体力恢复了一些。' }] },
      { type: 'adventure', text: '⚡ 忍饥挨饿继续赶路（体力-5，精神-3，时间-0.5h）', effects: [{ key: 'con', delta: -5 }, { key: 'san', delta: -3 }, { key: 'time', delta: -0.5 }] },
    ]
  },
  {
    id: 'network_signal',
    phase: 'NIGHT',
    weight: 7,
    text: '晚上发现手机信号极差，上传视频可能要花很长时间。',
    choices: [
      { type: 'safe', text: '🛡️ 等信号恢复（时间+1h）', effects: [{ key: 'time', delta: 1 }] },
      { type: 'adventure', text: '⚡ 用流量硬传（资金-20）', effects: [{ key: 'cny', delta: -20 }] },
    ]
  },
];

export const CAMP_EVENTS = [
  { id: 'wolf_howl', text: '🐺 半夜听到狼嚎声，你一夜没睡好...', effects: [{ key: 'energy', delta: -15 }, { key: 'san', delta: -5 }], weight: 3 },
  { id: 'meteor', text: '🌠 流星雨！你爬起来拍到了绝美星空延时！', effects: [{ key: 'materials', delta: 15 }, { key: 'san', delta: 10 }], weight: 2 },
  { id: 'rain_camp', text: '⛺ 帐篷漏雨了，你用身体护住设备...', effects: [{ key: 'energy', delta: -10 }, { key: 'san', delta: -3 }], weight: 4 },
  { id: 'bonfire_chat', text: '🔥 隔壁帐篷的驴友过来聊天，分享了一壶酥油茶。', effects: [{ key: 'san', delta: 8 }, { key: 'energy', delta: 5 }], weight: 3 },
  { id: 'peaceful_night', text: '🌌 星空璀璨，万籁俱寂，你睡了一个好觉。', effects: [{ key: 'san', delta: 5 }], weight: 5 },
  { id: 'theft_scare', text: '👤 半夜听到帐篷外有脚步声，原来是牦牛路过...虚惊一场。', effects: [{ key: 'san', delta: -3 }], weight: 3 },
];

export function rollCampEvent() {
  if (Math.random() >= 0.2) return null;
  const totalWeight = CAMP_EVENTS.reduce((sum, e) => sum + (e.weight || 1), 0);
  let roll = Math.random() * totalWeight;
  for (const event of CAMP_EVENTS) {
    roll -= (event.weight || 1);
    if (roll <= 0) return event;
  }
  return null;
}

export const NODE_EVENTS = {
  chengdu: { text: '你从成都出发，踏上了西行之路。背包里装着简单的装备和满腔热血。', effects: [{ key: 'msg', delta: 0, msg: '旅程开始！' }] },
  yaan: { text: '到达雅安，雨城的气息扑面而来。青衣江静静流淌，你可以在这里休整补给。', effects: [{ key: 'san', delta: 5 }, { key: 'con', delta: 3 }, { key: 'cny', delta: -30, msg: '买了一份雅鱼，花费¥30' }] },
  tianquan: { text: '到达天全镇，川藏线上的小驿站。路边有几家小饭馆和杂货铺。', effects: [{ key: 'san', delta: 2 }, { key: 'cny', delta: -15, msg: '吃了碗热气腾腾的面条，花费¥15' }] },
  erlangshan: { text: '穿过二郎山隧道，豁然开朗！云海在脚下翻涌，仿佛置身仙境。', effects: [{ key: 'san', delta: 8 }, { key: 'materials', delta: 5 }] },
  luding: { text: '到达泸定，大渡河波涛汹涌。铁索桥在风中微微晃动，让人想起那段历史。', effects: [{ key: 'san', delta: 3 }, { key: 'con', delta: 3 }, { key: 'materials', delta: 3 }] },
  kangding: { text: '到达康定，海拔2560米，空气开始稀薄。远处传来溜溜的情歌。', effects: [{ key: 'con', delta: -2 }, { key: 'materials', delta: 5 }] },
  xinduqiao: { text: '到达新都桥，摄影天堂。光与影在草原上交织，每一帧都是大片。', effects: [{ key: 'materials', delta: 10 }, { key: 'san', delta: 5 }, { key: 'con', delta: 2 }] },
  yajiang: { text: '到达雅江，雅砻江穿城而过。这里是中国最大的松茸产地，空气中都是森林的气息。', effects: [{ key: 'san', delta: 4 }, { key: 'cny', delta: -25, msg: '品尝了松茸炖鸡，花费¥25' }] },
  litang: { text: '到达理塘，世界高城，海拔4014米。天空低得仿佛伸手可触。', effects: [{ key: 'con', delta: -5 }, { key: 'san', delta: -3 }] },
  haizishan: { text: '海子山荒原上，1145个湖泊如星辰散落。这里像是外星球。', effects: [{ key: 'san', delta: 6 }, { key: 'materials', delta: 8 }] },
  batang: { text: '到达巴塘，弦子之乡。金沙江在这里拐了一个大弯，进入西藏前的最后一站。', effects: [{ key: 'san', delta: 5 }, { key: 'con', delta: 5 }, { key: 'cny', delta: -50, msg: '补充了氧气和药品，花费¥50' }] },
  mangkang: { text: '到达芒康，川藏滇三省交汇处。藏式民居和纳西族风情在这里交融。', effects: [{ key: 'san', delta: 3 }, { key: 'cny', delta: -20, msg: '买了些糌粑和酥油茶，花费¥20' }] },
  lhasa: { text: '到达拉萨！圣城就在眼前！布达拉宫在阳光下闪耀，你的骑行之旅画上了句号。', effects: [{ key: 'san', delta: 20 }, { key: 'materials', delta: 15 }] },
};

export const CONTENT_TYPES = {
  photo: { name: '📷 摄影图文', time: 1, energy: 10, stat: 'art' },
  video: { name: '🎬 剪视频', time: 4, energy: 30, stat: 'int' },
  live: { name: '🔴 做直播', time: 2, energy: 25, stat: 'hrt' },
};

export const PLATFORM_MULTIPLIERS = {
  photo: { bilibili: 0.5, douyin: 0.3, xiaohongshu: 2.0 },
  video: { bilibili: 2.0, douyin: 1.0, xiaohongshu: 0.5 },
  live: { bilibili: 0.8, douyin: 2.5, xiaohongshu: 0.2 },
};

export const ENDINGS = {
  dead: { title: '《横死路边》', desc: '你的体力在荒野中耗尽，倒在了通往拉萨的路上。风卷着沙尘覆盖了你的自行车。', type: 'bad', priority: 100 },
  insane: { title: '《精神崩溃》', desc: '长期的数据焦虑和网暴彻底击垮了你。你删掉了所有视频，消失在网络的另一端。', type: 'bad', priority: 90 },
  broke: { title: '《破产流浪》', desc: '资金耗尽，粉丝寥寥。你被迫在街头卖艺维生，偶尔有人认出你："这不是那个骑行网红吗？"', type: 'bad', priority: 80 },
  arrived: { title: '《抵达圣城》', desc: '经过漫长的跋涉，你终于看到了布达拉宫的轮廓。没有爆红，但也没有迷失。', type: 'neutral', priority: 50 },
  famous: { title: '《中国骑行第一人》', desc: '硬核的内容、真实的记录让你收获了千万粉丝。你证明了：真实，才是最大的流量密码。', type: 'good', priority: 60 },
  blackred: { title: '《黑红之王》', desc: '你成了全网最有争议的人。流量爆炸，但每一个评论区都是战场。这真的是你想要的吗？', type: 'neutral', priority: 55 },
};

export function getNextPoi(state) {
  for (let i = state.nodeIndex + 1; i < ROUTE.length; i++) {
    if (ROUTE[i].type !== 'road') {
      return ROUTE[i];
    }
  }
  return null;
}

export function getDistanceToNextPoi(state) {
  const next = getNextPoi(state);
  if (!next) return 0;
  return next.km - state.km;
}

export function formatDistance(km) {
  if (km >= 1000) return (km / 1000).toFixed(1) + 'km';
  return Math.round(km) + 'km';
}
