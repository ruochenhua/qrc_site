# W2：项目物件与扩展接口

父规划：[交互式像素世界主页总规划](2026-10-01-interactive-pixel-world-master.md)<br>
规格：[设计规格](../specs/2026-10-01-interactive-pixel-world-design.md)<br>
依赖：[W0 场景运行底座](2026-10-01-interactive-pixel-world-01-foundation.md)、[W1 像素地图与操作](2026-10-01-interactive-pixel-world-02-world-and-controls.md)

**目标：** 用稳定的项目注册表和可复用物件承载当前与未来作品。新项目资料、视觉素材、互动代码三者分离。

## 任务

- [x] **W2.1 定义 ProjectManifest 与校验器**
  - 为稳定 ID、标题、状态、简介、可选项目链接、地图定位、物件 sprite key、hit area 和互动定义类型。
  - 校验器检查 ID 唯一、状态合法、文字字段非空、已有页面路径存在、坐标在地图范围内、资源 key 已登记；制作中地点可无链接，预览不得渲染失效 CTA。
  - 生成可访问项目列表、地图对象和项目预览的输入都来自同一 manifest。
  - **验收：** 有效清单完整载入；坏数据返回带记录 ID 的错误；开发构建和 `verify:dist` 都运行校验。

- [x] **W2.2 实现闭合的 InteractionSpec 与 Action Router**
  - `panel`：打开标准 HTML 项目预览。
  - `navigate`：打开同源项目页面；必要时由访客主动选择当前页或新页。
  - `activity`：查找显式注册的 `activityId` 并动态加载模块，未知 ID 构建失败。
  - 不接受 manifest 中的任意函数、URL 脚本或动态模块路径。
  - **验收：** 三种动作各有测试；未知类型/ID 不执行代码；关闭活动时清理事件、计时器、输入和素材引用。

- [x] **W2.3 实现 ProjectObject 通用场景实体**
  - 以一个 Phaser GameObject 组合呈现静态 sprite、帧动画、脚底排序点、独立 hit area、靠近范围和选择态。
  - 清楚区分“场景阻挡碰撞”和“可互动区域”；建筑轮廓可阻挡角色，门牌/按钮可被点选。
  - 通用实体只发出 `{ type, projectId }` 事件；详情和链接由 Action Router/DOM 处理。
  - **验收：** 同一实体渲染至少三种外观和三种动作；图层排序、碰撞和互动区域相互独立。

- [x] **W2.4 注册首页现有项目**
  - 实施时从当时的首页有效项目卡片和目录核对项目；不可把临时/废弃记录带入世界。
  - 规划中的地点对应骑行驿站、烟花观景台、发财树温室和地下遗迹；额外有效项目分配到街机/工作台/空展台。
  - 项目状态和文案与首页全屏错误回退入口一致；默认游玩状态下不显示该项目列表。`BLOG-LATEST` 生成标记和博客生成器不得改写/失配。
  - **验收：** 自动脚本核对主页项目链接、manifest、地图物件一一对应；每个项目目标文件存在。
  - **实施前核对：** 首页包含四项，其中 `kings-field/index.html` 当前不存在。保留“王土之下”的制作中展示和世界遗迹物件，但其 manifest 记录不带 `href`，构建只对有目标的记录做路径存在校验。

- [x] **W2.5 完成“新增项目”扩展示例**
  - 增加一个仅作为测试的临时项目 fixture：新增 manifest、地图物件和 sprite key，不改通用场景实现。
  - 再为一个演示物件增加轻量 activity，验证活动启动、结束、返回主世界和延迟加载。
  - **验收：** fixture 可在测试图中打开；产品清单不带临时 fixture；activity 专属文件未互动前不出现在初始网络请求。

## 新项目接入操作规程

1. 为项目选稳定 ID，写标题、状态、短简介和现有项目页路径。
2. 选择地图对象位置或分配空展台；位置留有角色通行空间。
3. 使用已有物件 archetype，或新增同尺寸/同 palette 的 spritesheet。
4. 选择 `panel`、`navigate`；只有真的需要时才实现新的 `activity`。
5. 运行 schema/link/map 检查和扩展 E2E；构建更新 `assets/world/runtime/`。

## 子规划验收

- 普通新项目只增加资料与资源即可显示、被操作、展示文案和访问作品。
- 任意输入值不能注入可执行脚本；所有项目链接均通过本仓库允许的路径解析。
- 活动可以独立加载、暂停和销毁，不会污染共享主页状态。
- 静态项目列表与场景清单不出现双份手写事实来源。

## W2 本机执行记录

- `npm run validate:projects`、`npm run typecheck`、`npm run test:unit`、`npm run test:e2e`、`npm run build` 与 `npm run verify:dist`：通过。
- 项目 manifest、地图锚点、Sprite key、目标链接与活动 ID 使用同一校验流程；生成的全屏失败回退入口与运行场景共用项目清单。
- Playwright 与单元测试覆盖三类动作路由、未登记活动拒绝、延迟加载烟花演示和新增项目记录/地图锚点扩展演练。
