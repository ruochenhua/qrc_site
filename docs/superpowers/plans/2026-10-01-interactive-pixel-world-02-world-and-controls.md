# W1：像素地图、角色与操作

父规划：[交互式像素世界主页总规划](2026-10-01-interactive-pixel-world-master.md)<br>
规格：[设计规格](../specs/2026-10-01-interactive-pixel-world-design.md)<br>
依赖：[W0 场景运行底座](2026-10-01-interactive-pixel-world-01-foundation.md)

**目标：** 建立一张可移动、可碰撞、像素清晰、可键盘和触屏访问的工作室小镇地图。

## 任务

- [x] **W1.1 建立像素和地图规范**
  - 以 16×16 地砖、16×24 角色帧、640×360 逻辑视口为原型基准；完成移动端可读性检查后冻结或记录具体调整。
  - 定义颜色数量、轮廓/光源方向、透明边距、命名约定和源文件到 PNG+JSON 的确定导出步骤。
  - 以 Tiled 创建 orthogonal JSON 地图，分离地面、遮挡装饰、碰撞、玩家出生点和项目物件对象层。
  - 将入口、室内/室外空间、工作台、道路、观景台、温室、地下入口和未来空地放进第一版地图。
  - **验收：** 地图资源可被 Phaser 加载；所有出生点、互动区域和地图边界有 schema 检查；对象层名称有文档说明。
  - **结果：** 48×32、16px orthogonal Tiled JSON 地图拥有 `Ground`、`Details`、`Blockers`、`Objects` 四层；map validator 检查层尺寸、唯一出生点、物件边界、重复 ID 和地点锚点。美术与地图约定见 [`site-world/art/README.md`](../../../site-world/art/README.md)。

- [x] **W1.2 建立玩家 Sprite Sheet 管线**
  - 源资产使用 PNG 图集和 Aseprite-compatible JSON Hash 帧/动画标记；导出命名和帧坐标固定在资产说明中。
  - 首版玩家包括四方向 idle（每方向一帧）和 walk（每方向三帧）；交互姿势可后补。
  - Phaser 动画 key 使用统一命名，如 `player-walk-down`；资源缺失不能让场景启动崩溃。
  - **验收：** 自动化检查帧越界/缺方向/空动画；人工目检播放方向和接缝；移动时方向与最后输入一致。
  - **结果：** 确定性生成脚本输出四方向、每方向三帧的 16×24 PNG 图集和 Aseprite-compatible JSON Hash 帧标记；Phaser 以 `player-walk-{direction}` 播放，测试检查12帧和四方向标签，截图目检轮廓与步态。

- [x] **W1.3 建立地图层级、碰撞和角色移动**
  - 地面先渲染；角色按脚底 y 坐标与遮挡装饰排序；顶部 UI 不参与地图排序。
  - 从 Tiled 碰撞属性生成碰撞体，设置世界边界和角色脚底 hitbox。
  - 键盘移动采用一致速度并处理斜向归一；输入结束切换对应方向 idle。
  - **验收：** 角色不能穿墙、卡在角落或走出地图；不同帧率下移动距离一致；场景暂停时不能移动。
  - **结果：** Tiled Tile Set 的 `solid` 属性驱动地面水域和 Blockers 瓦片碰撞；角色使用脚底 hitbox、世界 bounds、方向归一化和脚底 y-depth 排序。浏览器测试确认角色遇围栏停止、移动动画切换。

- [x] **W1.4 建立相机和屏幕缩放**
  - 摄像机在桌面保持完整场景/合理边界；地图超出可视区时跟随角色并限制在世界 bounds 内。
  - 使用最近邻像素显示和像素坐标取整；保留宽高比，不拉伸 Tile。
  - 移动端采用窄屏布局和可点物件，不缩小 HTML 操作和面板目标；画面允许裁切地图边缘，但不能裁掉入口/项目列表按钮。
  - **验收：** 320px 宽、390px 宽、768px、1280px 及 1920px viewport 无横向滚动；像素边缘没有模糊插值；关键互动目标可见。
  - **结果：** Phaser FIT 保持 16:9、像素最近邻与 round-pixel；地图镜头跟随并受世界边界约束。Playwright 逐个检查 320/390/768/1280/1920px 无横向滚动且场景和静态项目链接可见。

- [x] **W1.5 建立统一输入与交互提示**
  - 键盘：WASD/方向键移动，E/Enter 互动，Escape 关闭当前交互；输入映射集中管理。
  - 点按：项目物件具有独立互动 hit area，鼠标/触屏均可直接互动；装饰物不拦截点击。
  - 角色进入交互距离时显示名称/按键提示；鼠标悬停和触屏点中显示相同项目标签。
  - **验收：** 键盘和 pointer 不重复触发同一动作；同屏物件 z-order/hit order 符合视觉顺序；输入焦点在 HTML 表单/按钮时不驱动玩家。
  - **结果：** WASD/方向键移动，E/Enter 选择近处地点，Escape 发出关闭事件；地点有独立 pointer hit area，鼠标和触屏共用一次选择事件。测试通过键盘选中、鼠标/触屏点选和聚焦输入框时只输入文本不移动。

- [x] **W1.6 记录无障碍偏好**
  - 支持 reduced motion，关闭相机弹性、闪光和循环小装饰；角色移动与必要状态仍能明确表达。
  - Canvas 以装饰/交互视觉层标注；DOM 提供控制说明和地图内容入口。
  - **验收：** Playwright 模拟 reduced-motion；键盘操作场景不依赖颜色或动画帧识别当前项目。
  - **结果：** `prefers-reduced-motion` 关闭相机缓动；场景目前没有持续闪烁/粒子循环。Playwright reduce 模式测试和始终可见的静态 HTML 项目入口通过。

## 子规划验收

- Unit：角色移动向量、斜向速度归一、碰撞边界、对象层数据合法性。
- Browser：WASD/方向键走动、E/Enter 互动提示、Escape 退出；对墙体不能穿越。
- Browser：pointer click/touch 对物件命中一次，点击纯装饰不打开项目。
- Visual：高分辨率像素边缘清楚，角色脚底与物件遮挡顺序自然。
- Device：窄屏访问无强制键盘要求，静态项目列表始终可触达。

## W1 本机执行记录

- `npm run art:generate`：可复现地生成 tileset、角色/地点图集、动画 JSON Hash 资料与 Tiled map。
- `npm run typecheck`：通过。
- `npm run test:unit`：2个测试文件、7个用例通过。
- `npm run test:e2e`：8个用例通过，含墙体碰撞、四向输入、Sprite 帧切换、E/Enter/Escape、点击、触屏、表单焦点、reduced-motion、五档视口及脚本失败回退。
- `npm run build`：通过；Phaser 入口 gzip 约 360.54 KiB；3 张 PNG 合计 2,738 bytes，地图 JSON gzip 约 1.49 KiB。
- `npm run verify:dist`：通过；7 个静态 runtime 文件和每个资源引用均存在，gzip 与图像预算通过。
- `npm run test:e2e:production`：2个用例通过；根路径同源加载 3 张 PNG 和 1 份地图 JSON，禁用运行入口仍保留链接。
- 浏览器截图目检：道路、地点、角色图集在 960×540 舞台显示无模糊插值；本机 Chromium。Safari/iOS 与真实 Android 设备仍属 W3 人工验收范围。
