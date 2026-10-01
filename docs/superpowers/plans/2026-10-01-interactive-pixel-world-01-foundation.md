# W0：场景运行底座与构建链

父规划：[交互式像素世界主页总规划](2026-10-01-interactive-pixel-world-master.md)<br>
规格：[设计规格](../specs/2026-10-01-interactive-pixel-world-design.md)

**目标：** 在不改写根目录网站构建方式的条件下建立隔离、可测试、可产出同源静态资源的 2D 场景项目。

**技术：** Phaser 4.2.0 + TypeScript + Vite + Vitest + Playwright Test。Phaser 与工具版本锁进 `site-world/package-lock.json`。根目录不增加 package 管理入口。

## 任务

- [x] **W0.1 复核当前工作区与页面发布条件**
  - 对比 `index.html`、`CONTEXT.md` 及未跟踪文件的当前改动；记录不得覆盖的变更。
  - 核对 GitHub Pages 发布根目录、`www.qrc-eye.com` 路径、大小写敏感路径和当前项目链接。
  - **验收：** 实施记录说明首页脚本挂载点和安全构建输出目录；现存改动均有保留方案。
  - **结果/限制：** 已保留用户对 `index.html` 与 `CONTEXT.md` 的未提交改动；仓库原先没有 Pages workflow，Pages API 读取返回 404，无法读取远端设置。场景资源构建到站点根目录的 `assets/world/runtime/`，发布前仍需用实际预览确认根路径。

- [x] **W0.2 建立隔离项目骨架**
  - 创建 `site-world/src/`、`site-world/test/`、`site-world/maps/`、`site-world/art/`。
  - 创建独立 `package.json`、lockfile、`tsconfig.json`、`vite.config.ts`。
  - 建立 `dev`、`typecheck`、`test:unit`、`test:e2e`、`build`、`verify:dist` 脚本。
  - **验收：** 在全新依赖安装后每条命令都有确定结果；根目录现有 GitHub Pages 文件布局不被改动。

- [x] **W0.3 建立 Phaser 生命周期和错误边界**
  - 新建唯一 `mountWorld(host, options)` / `unmountWorld()` 生命周期入口，防止首页重复初始化。
  - Phaser 配置容器、逻辑尺寸、像素渲染选项、缩放和 Canvas/WebGL renderer fallback。
  - 当前只保留 World Scene；地图/精灵资源加入 W1 后再按需要拆出 Boot Scene。DOM host 通过动态 import 捕获初始化失败并保留静态入口。
  - **验收：** 挂载/销毁两次不会留下重复 canvas、键盘监听或动画循环；初始化失败会被捕获并恢复静态首页。

- [x] **W0.4 固定生成路径与 runtime 资产策略**
  - Vite 生产输出放在 `assets/world/runtime/`，入口文件名稳定，分包与资源名由 manifest/相对路径解析。
  - 生成目录只允许由构建命令清理；清理目标解析后必须验证等于仓库 `assets/world/runtime` 子目录。
  - `site-world/art` 中源地图和源美术进入构建产物；不把源测试、编辑器缓存和依赖打入 runtime。
  - **验收：** 运行 build 两次，runtime 内容一致；引用的每个 JS/CSS/地图/图片都存在；构建不会触碰其它 `assets/` 内容。
  - **结果：** W1 接入资源后生产输出含 7 个文件：稳定的 `world.js`/`world.css`、带 hash 的 Tiled JSON 与 3 张 PNG atlas、Phaser 4.2.0 MIT 许可证。Vite 普通 ES module entry 保留 `mountWorld`/`unmountWorld` 导出，同时确保美术资源独立同源请求；`verify:dist` 检查每条引用。

- [x] **W0.5 验证开发与静态生产运行**
  - 提供本地开发服务器和生产预览，不使用 `file://` 作为唯一验证方式。
  - 建立只含地面色块与临时角色的 placeholder scene。
  - 在页面禁止加载 world bundle 时保留普通项目入口。
  - **验收：** 开发页与生产预览均能启动场景；控制台没有未处理错误；浏览器断网时静态内容可用。

- [x] **W0.6 加入最小 CI**
  - 新增独立质量 workflow，仅对 `site-world/**`、`assets/world/runtime/**` 和相关首页入口变更执行。
  - CI 使用锁文件安装，运行 typecheck、unit、build、dist 校验和 Chromium E2E。
  - 检查 runtime 已提交且与 build 输出一致；CI 不负责发布或切换 Pages 设置。
  - **验收：** 新分支干净 checkout 可通过；删掉生成产物会使校验失败；非场景子项目不被要求安装根依赖。
  - **结果/限制：** workflow 已加入；本机逐条运行了 typecheck、单测、dev E2E、生产 E2E、build 与 dist 检查。远端 GitHub Actions 需在提交后首次运行确认。

## 子规划验收

- `npm ci --prefix site-world` 成功。
- `npm run typecheck --prefix site-world` 成功。
- `npm run test:unit --prefix site-world` 成功。
- `npm run build --prefix site-world` 成功并输出同源 runtime。
- `npm run verify:dist --prefix site-world` 成功。
- 自动化浏览器加载路径只访问当前网站，不访问 Phaser CDN。
- root 项目、游戏、博客生成器没有被合并到 `site-world` 包管理中。

## 本机执行记录

- `npm ci`：通过。
- `npm run typecheck`：通过。
- `npm run test:unit`：1 个文件、2 个用例通过。
- `npm run test:e2e`：2 个用例通过。
- `npm run build`：通过；W1 场景 world JS gzip 约 360.54 KiB。
- `npm run verify:dist`：通过；确认 7 个 runtime 文件、3 张 PNG 和地图 JSON 均被引用；没有 source map/CDN/未打包 Phaser import，JS 与图像预算有效。
- `npm run test:e2e:production`：2 个用例通过；验证根路径 bundle、静态项目链接及入口失败降级。
- 连续两次生产构建的文件哈希一致。
