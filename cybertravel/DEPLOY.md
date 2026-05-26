# CyberTravelGame 部署指南

> 方案：Git + 宝塔 Webhook 自动部署
> 目标：本地改代码 → `git push` → 自动同步到域名

---

## 为什么选这个方案

| 优势 | 说明 |
|------|------|
| 一键部署 | 本地 `git push` 后自动上线，无需手动传文件 |
| 版本回滚 | 改坏了 `git revert` 即可恢复 |
| 与 OpenSpec 契合 | 代码变更 → commit → 自动部署，流程自然 |
| 免费 | GitHub + 宝塔自带功能，零额外成本 |

---

## 前置条件

- [ ] GitHub 账号（或腾讯云 Code）
- [ ] 宝塔面板登录权限
- [ ] 域名已解析到服务器
- [ ] 服务器已安装 Git

---

## Step 1：创建 Git 仓库

### 选项 A：GitHub（推荐）

1. 登录 https://github.com
2. 点击右上角 `+` → `New repository`
3. 填写：
   - Repository name：`CyberTravelGame`
   - Visibility：`Public`（或 Private，需配置 SSH key）
   - 勾选 `Add a README file`
4. 点击 `Create repository`

### 选项 B：腾讯云 Code（国内访问快）

1. 登录 https://dev.tencent.com/
2. 新建项目 → 上传代码

---

## Step 2：本地代码推送到仓库

打开终端（Git Bash / PowerShell）：

```bash
# 进入项目目录
cd E:/Projects/CyberTravelGame

# 初始化 Git
git init

# 添加远程仓库（把下面的用户名换成你的）
git remote add origin https://github.com/你的用户名/CyberTravelGame.git

# 添加文件
git add index.html

# 提交
git commit -m "init: MVP 完整版"

# 推送到远程
git push -u origin main
```

> 如果是 `master` 分支，把 `main` 换成 `master`

---

## Step 3：宝塔面板配置 Git 部署

1. 登录宝塔面板
2. 左侧菜单 → `网站` → 找到你的域名 → 点击 `设置`
3. 顶部标签 → `Git 部署`
4. 点击 `添加仓库`，填写：

| 字段 | 填写内容 |
|------|---------|
| 仓库地址 | `https://github.com/你的用户名/CyberTravelGame.git` |
| 分支 | `main`（或 `master`） |
| 部署目录 | `/www/wwwroot/你的域名/` |
| 部署前命令 | （留空） |
| 部署后命令 | `echo "Deployed at $(date)" >> /tmp/deploy.log` |

5. 点击 `保存` → `测试部署`
6. 看到 `成功` 即配置完成

---

## Step 4：配置 Webhook（自动触发部署）

### 4.1 获取宝塔 Webhook URL

在宝塔 `Git 部署` 页面，找到你的仓库，点击 `查看 Webhook`。

会看到一个 URL，类似：
```
https://你的域名:8888/git_hook?token=abc123def456
```

复制这个 URL。

### 4.2 GitHub 配置 Webhook

1. 打开 GitHub 仓库页面
2. 点击 `Settings` → `Webhooks` → `Add webhook`
3. 填写：
   - **Payload URL**：粘贴宝塔的 Webhook URL
   - **Content type**：`application/json`
   - **Secret**：留空
   - **Which events?**：选择 `Just the push event`
4. 点击 `Add webhook`

### 4.3 验证 Webhook

1. 在 GitHub Webhooks 页面，看到你添加的 webhook
2. 点击 `Edit` → 底部 `Recent Deliveries`
3. 应该有一个绿色的勾 ✅，表示测试推送成功

---

## Step 5：本地工作流（日常使用）

```bash
# 进入项目目录
cd E:/Projects/CyberTravelGame

# 修改代码（用编辑器改 index.html）

# 查看变更
git status

# 添加变更
git add index.html

# 提交（写有意义的提交信息）
git commit -m "feat: 新增 Sin 弱信号提示"

# 推送到远程 → 自动触发部署！
git push
```

推送后约 5-10 秒，访问你的域名即可看到更新：
```
https://你的域名/index.html
```

---

## 常见问题

### Q1：宝塔 Git 部署提示 "仓库地址错误"

- 检查仓库地址是否完整（包含 `.git` 后缀）
- 如果是 Private 仓库，需配置 SSH key 或使用 HTTPS + Personal Access Token

### Q2：Webhook 推送失败

- 检查服务器防火墙是否放行 8888 端口
- 检查宝塔面板 `安全` → `放行端口` 中是否有 8888
- 检查域名解析是否正确

### Q3：部署成功但网页没更新

- 浏览器缓存问题，按 `Ctrl+F5` 强制刷新
- 检查部署目录是否正确（应该是网站根目录）
- 检查 `index.html` 是否在仓库根目录

### Q4：想回滚到上一个版本

```bash
# 查看提交历史
git log --oneline

# 回滚到上一个版本
git revert HEAD

# 推送（自动部署旧版本）
git push
```

---

## 附录：提交信息规范

```
feat: 新增功能
fix: 修复 bug
docs: 文档更新
style: 代码格式（不影响功能）
refactor: 重构
perf: 性能优化
```

示例：
```bash
git commit -m "feat: 新增 8 个大事件和 Sin 系统"
git commit -m "fix: 修复结局画面黑红值显示错误"
```

---

## 下一步

1. [ ] 注册 GitHub 账号
2. [ ] 创建 `CyberTravelGame` 仓库
3. [ ] 本地 `git push` 第一次代码
4. [ ] 宝塔面板配置 Git 部署
5. [ ] GitHub 配置 Webhook
6. [ ] 测试：本地改代码 → `git push` → 访问域名验证

---

> 有问题随时问我，可以帮你排查具体错误。
