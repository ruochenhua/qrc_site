# 公会小镇像素素材约定

## 画面标尺和透视

- 世界地图为 Tiled `orthogonal` 正交投影，每格 16×16 px；游戏逻辑范围 48×32 格，即 768×512 世界像素。
- `guild-town-dusk.webp` 是 1536×1024 的 2×场景底图，在游戏坐标中缩放到 768×512。底图按用户选定的公会美术图和正交地图图制作，包含五处可交互地点与庭院环境。
- 建筑、树木、家具和人物共享同一个 2D 俯视坐标平面：不随远近缩放，不混入等距菱形地砖，也不把不同焦段拼成一张场景图。
- 人物图集为 48×96 px，每帧 16×24 px；按 down、left、right、up 排行，每行三个步行动作帧。
- Tiled 的 `Ground`、`Details`、`Blockers` 图层为底图提供对应的行走空间与不可见碰撞；项目锚点以地图世界像素记录，透明交互区覆盖画中的地点。
- 2D 角色沿用整数像素动画。地图底图使用 crisp nearest-neighbor 缩放，保留图像生成后的像素簇边缘。

## 傍晚公会色板

石板蓝紫和墨色用于阴影，灰橄榄绿用于草地与树叶，旧木、铜红和羊皮纸用于公会建筑，琥珀色窗火和玫瑰暮色提供暖光。角色与程序生成图集的颜色集中维护在 `scripts/generate-world-art.mjs` 的 `palette`。

## 地图层和碰撞

| 图层 | 类型 | 用途 |
|---|---|---|
| `Ground` | Tile Layer | 兼容的地面网格；当前视觉由场景底图提供。 |
| `Details` | Tile Layer | 预留的额外地表细节层。 |
| `Blockers` | Tile Layer | 建筑、中央喷泉与地图边缘的隐藏碰撞；Tile 属性 `solid: true` 会生成 Arcade 碰撞。 |
| `Objects` | Object Layer | 唯一 `player-spawn` 与五个 `project-anchor`。 |

项目锚点像素坐标与 E2E 交互夹具共用；改动前需要同步更新交互测试。素材表达只影响外观，建筑的点击热区继续由项目 manifest 定义。

## 生成

在 `site-world/` 中运行 `npm run art:generate` 会确定性生成碰撞图集、玩家动画元数据和 `maps/workshop-town.json`。黄昏公会底图作为独立 WebP 资源存放在本目录，不会被图集生成器覆盖。项目名称与入口仍由 `src/projects/manifest.json` 管理。

动画命名为 `player-walk-{down|left|right|up}`，运行时使用三帧 ping-pong。生产构建把图集和地图作为独立同源资源复制到 runtime 目录；`verify:dist` 会检查资源引用和体积预算。
