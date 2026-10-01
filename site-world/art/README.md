# 像素世界素材约定

## 画面标尺

- 地图采用 Tiled orthogonal JSON；每格 16×16 px；第一张地图 48×32 格。
- 玩家图集为 48×96 px，每帧 16×24 px。按 down、left、right、up 排行，每行三个步行动作帧；停步帧取中间帧。
- 地点图集为 96×560 px，每个地点一帧（96×80 px）。对象坐标表示贴图脚底中心，建筑以画面顶部向下绘制。
- 所有轮廓、窗格、地面纹样按整数像素绘制，不使用半透明阴影、抗锯齿或亚像素坐标；人物和地点帧四周留透明边缘。
- 光源默认来自左上方：亮面放在左上，最暗轮廓和投影落在右下/脚底。通用深色轮廓为 `#253b3b`。

## 色板

生成器中的 30 个不透明色票覆盖夜蓝绿轮廓、草地、土路、石材、木料、玻璃、暖灯、肤色和少量砖红，另有一个透明色。每个单体尽量限定在 4–6 色，避免高饱和荧光色成为主色。色票的精确 RGB 值集中维护在 `scripts/generate-world-art.mjs` 的 `palette` 对象。

## Tiled 图层和属性

| 图层 | 类型 | 用途 |
|---|---|---|
| `Ground` | Tile Layer | 草地、石路、木栈道和水面；tile 属性 `solid: true` 的格子不可行走。 |
| `Details` | Tile Layer | 地面上的小装饰；此版本保留空层以稳定地图 schema。 |
| `Blockers` | Tile Layer | 围栏、石块、树篱等可见障碍；读取 Tile Set 的 `solid: true` 属性生成 Arcade 碰撞。 |
| `Objects` | Object Layer | 唯一 `player-spawn`、`project-anchor` 地点和纯装饰 `scenery`；项目锚点的 `projectId` 与注册表 ID 对应。 |

地图边界由 Phaser 世界 bounds 阻挡；对象坐标必须落在地图尺寸内。项目物件的可点区域由代码中的 `hitArea` 定义，与地砖碰撞属性分离。

## 资源生成与更新

运行 `npm run art:generate`（在 `site-world/` 内）会确定性地生成三张 RGBA PNG、Aseprite-compatible JSON Hash 动画帧资料和 `maps/workshop-town.json`。像素源图目前由 `scripts/generate-world-art.mjs` 中的整数像素绘制函数维护；生成后的 PNG/JSON 是构建输入，改画时更新生成器并重新运行命令，不直接编辑生成产物。项目卡片也由 `src/projects/manifest.json` 生成：更新项目记录后运行 `npm run sync:homepage`，生成器只替换根 `index.html` 的 `WORLD-PROJECTS` 标记区间。

动画命名为 `player-walk-{down|left|right|up}`。JSON `meta.frameTags` 用三帧 ping-pong 描述方向行；游戏运行时重复中间帧，避免停步瞬间视觉跳变。地点 sprite key 及其 atlas frame 对应关系集中登记在 `src/projects/sprite-registry.json`。

生产构建把图集和 Tiled JSON 作为独立的同源 hashed 文件写入 `assets/world/runtime/assets/`。`verify:dist` 检查其引用、PNG 总量和入口 JS gzip 预算。
