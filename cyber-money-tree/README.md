# 赛博发财树

QRC-Eye 站内的多人共享成长小项目。访客可以查看全站浇水总数和十级成长，浇一滴水后得到全站序号、收下一张其他树友留下的叶笺，再从预设海报和安全短句中制作一张祝福留给下一位。

页面不接受自由文字、图片上传、评论或回复。匿名浏览器编号只用于统计本设备浇水次数和确认叶笺归属；收到的叶笺保存在当前浏览器。

公共叶笺墙一次展示最多 10 张：按点赞数挑出 3 张人气叶笺，再随机抽取 7 张供发现；这批内容仍按点赞数排序，访客可以点赞，每个浏览器对每张叶笺只计一次。点“换一批叶笺”或重新打开页面会重新抽样。来信总数会独立显示，不会一次加载全部历史内容；点“保存海报”仍可导出完整尺寸海报。

## 全站成就与解锁

成就解锁记录存于共享 D1，全站访客看到同一份进度。19 个公开成就分为浇水总量、不同树友、访客叶笺和十分钟接力段四组；另有 3 个只在行为发生后揭晓的隐藏成就。已完成美术的成就海报会加入叶笺选择器；标为「美术制作中」的卡面先显示空占位，不会被当作可用海报，之后补上美术即可开放给所有人。

## 本地运行

需要 Node.js 20.19+ 或 22.12+。

```sh
npm install
npm run dev
```

Wrangler 会启动本地 Worker 和页面（默认 `http://localhost:8787`），并在首次运行时把 D1 迁移应用到本地数据库。启动后用浏览器打开终端显示的地址。开发数据存储在本项目的 `.wrangler/` 下，不会写到 Cloudflare 线上数据库。

## 测试与截图

```sh
npm test
npx playwright install chromium
npm run test:e2e
```

`npm test` 先构建页面，然后运行领域单测和 Cloudflare Worker + D1 集成测试。`npm run test:e2e` 会启动本地 Worker，分别在桌面 Chromium 和 iPhone 13 视口中走完浇水、收信、收藏、制作和发布，并把整页截图保存到本项目 `screenshots/qa/`。

Playwright Chromium 只需首次安装。若要清空本地共享树和叶笺，请先停止本地 Worker，再删除 `cyber-money-tree/.wrangler/state/v3/d1/`，然后运行：

```sh
npm run db:migrate:local
```

这会重新创建空树，并放入六张树主赠礼叶笺。只删除本地 D1 目录，不会影响 Cloudflare 远程数据库。

## 项目结构

- `src/worker.js`：共享状态、浇水和叶笺 API。
- `migrations/`：D1 表结构与初始赠礼。
- `shared/`：十级成长、社区成就档位、海报目录和短句白名单。
- `client/`：页面交互、浏览器收藏册与 PNG 海报导出。
- `assets/scenes/`：五张按办公室、窗外、屋顶、城市和宇宙分段的像素场景图。
- `assets/achievements/`：已完成的成就卡面。
- `test/unit/`、`test/integration/`、`test/e2e/`：单元、Worker/D1 集成和真实浏览器流程测试。

## 部署

共享计数需要所有访客连到同一个 Worker 和 D1。静态页面可以由 Worker 一起托管，也可以部署在 GitHub Pages 并把 API 指向该 Worker。

1. 登录 Cloudflare Wrangler：`npx wrangler login`。
2. 创建远程 D1：`npx wrangler d1 create qrc-cyber-money-tree`。
3. 将命令返回的 `database_id` 写入 `wrangler.jsonc`，替换本地占位 ID。
4. 将 `wrangler.jsonc` 的 `ALLOWED_ORIGINS` 设置为实际网站来源（例如 `https://www.qrc-eye.com`，只填 origin，不带页面路径）。
5. 应用迁移并部署：

   ```sh
   npx wrangler d1 migrations apply qrc-cyber-money-tree --remote
   npm run deploy
   ```

默认配置会把 Worker 和 `dist/` 静态页面部署在一起。若把页面单独放到 GitHub Pages，编辑 `config.js`，将 `API_BASE_URL` 设为 Worker 的完整 origin；同时确认该 Pages origin 在 Worker 的 `ALLOWED_ORIGINS` 中。共享计数只来自此 Worker 绑定的 D1，不会由浏览器本地模拟。

## 成长阶段

| 等级 | 全站浇水数 | 场景 |
| --- | ---: | --- |
| 01–02 | 0–7 | 阳光办公室 |
| 03–05 | 8–149 | 窗边与伸出楼外 |
| 06–07 | 150–799 | 冲破屋顶与天台树园 |
| 08 | 800–1,799 | 街区树荫 |
| 09–10 | 1,800+ | 行星与银河 |

具体门槛在 `shared/progression.js`。共同成长达到等级 4、6、8、10 时，分别解锁新的叶笺海报。
