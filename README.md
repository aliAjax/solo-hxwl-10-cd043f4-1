# hxwl-10 考古探方记录

遗址探方、地层关系与出土物坐标档案

## 技术栈

React + Vite + TypeScript + CSS

## 本地运行

```bash
npm install
npm run dev
```

开发端口：5110

## 功能

- 领域指标看板（记录总数、探方数、地层数、出土物、未整理记录，随记录动态更新）
- 角色和分类筛选
- 专业字段录入区（遗址、探方、遗迹类型为必填，缺项时提示并阻止新增）
- 新增记录并持久化到 localStorage，刷新后保留
- 按探方编号、遗迹类型筛选记录，可一键清空
- 记录整理状态切换（未整理/已整理）
- 导出当前筛选结果为文本摘要
- 可继续扩展IndexedDB、权限、后端API和复杂图表

## 测试

```bash
npm test        # vitest + testing-library，覆盖新增、筛选、持久化、必填校验与看板
npm run typecheck
```
