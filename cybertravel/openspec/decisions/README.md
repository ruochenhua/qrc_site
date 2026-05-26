# ADR (Architecture Decision Records)

## 什么是 ADR

架构决策记录 (Architecture Decision Record) 用于记录项目中重要的架构决策及其上下文。每个 ADR 记录一个决策，包含：

- **背景**: 为什么需要做决策
- **决策**: 选择了什么方案
- **后果**: 这个决策带来的影响

## ADR 格式

```markdown
# ADR-XXX: 标题

## 状态
- proposed | accepted | deprecated | superseded by ADR-YYY

## 背景
描述问题上下文

## 决策
明确声明决策内容

## 后果
- 正面影响
- 负面影响
- 风险
```

## 维护指南

1. **创建**: 当引入新的架构决策时创建新 ADR
2. **编号**: 按顺序编号，永不复用
3. **更新**: 状态变更时更新 ADR，不删除历史 ADR
4. **索引**: 在 adr-index.md 中维护索引和影响矩阵

## 当前 ADR 列表

见 [adr-index.md](./adr-index.md)
