# ADR-005: localStorage 持久化

## 状态
accepted

## 背景
MVP 需要存档功能。localStorage 是浏览器原生 API，无需额外依赖。

## 决策
MVP 阶段使用 localStorage 进行数据持久化：
- 自动存档：每日结算后自动保存
- 手动存档：玩家可主动保存
- 存档槽位：单槽位 (MVP) / 多槽位 (正式版)
- 存档内容：完整 GameState JSON

## 后果

### 正面影响
- 原生 API，零依赖
- 同步 API，简单易用
- 足够存储游戏状态数据

### 负面影响
- 存储空间有限 (~5MB)
- 无法跨设备同步
- 浏览器清理时可能丢失
- 微信小程序不支持 localStorage

### 缓解措施
- MVP 阶段单槽位，控制存档大小
- 正式版迁移到 wx.storage + 服务器存档
- 提供导出/导入存档功能 (JSON 文件)
