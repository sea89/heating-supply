# 供热公司备件采购维修管理系统 — AI 助手指南

## 项目概述

供热公司内部使用的备件采购、库存管理和维修工单管理 Web 应用。
中文 UI，面向维修、仓管、采购三类角色 + 系统管理员。

## 技术栈

- **前端**: React 18 + Vite 5 + Ant Design 5 + Tailwind CSS 3
- **后端**: Node.js 20 + Express 4
- **数据库**: PostgreSQL 16
- **ORM/迁移**: Knex.js 3
- **认证**: JWT
- **部署**: Docker Compose (3 services: db, server, client)

## 目录结构

```
heating-supply-app/
├── server/
│   ├── src/
│   │   ├── controllers/     # API 控制器
│   │   ├── routes/          # 路由定义
│   │   ├── middleware/      # auth, errorHandler, logger
│   │   ├── config/          # 数据库配置
│   │   └── utils/           # 工具函数
│   ├── db/
│   │   ├── migrations/     # Knex 数据库迁移
│   │   └── seeds/          # 种子数据（仅首次部署运行）
│   ├── setup.js            # 容器启动时运行：迁移 + 条件种子
│   └── Dockerfile
├── client/
│   └── src/
│       ├── pages/          # 页面组件
│       │   ├── basicData/   # 基础数据（设备、供应商、人员、系统分类）
│       │   ├── inventory/   # 库存管理（入库、出库、调拨、流水）
│       │   ├── parts/       # 备件管理（分类、列表、详情）
│       │   ├── purchases/   # 采购管理（采购单、到货）
│       │   ├── tools/       # 工具管理（借用、归还）
│       │   └── workOrders/  # 维修工单
│       ├── components/     # 公共组件
│       ├── context/        # React Context
│       └── api/            # API 客户端（axios 封装）
├── docker-compose.yml
└── nginx/                  # Nginx 配置（生产环境）
```

## 关键约定

### 编码规范

- 前端使用 **React 函数组件 + Hooks**，不使用 class 组件
- 使用 **Ant Design** 组件库，优先用 Table、Form、Card、Descriptions、Tag、Space
- API 请求通过 `client/src/api/client.js`（axios 实例）发送
- 后端控制器遵循 `(req, res, next)` 签名，错误统一由 `errorHandler.js` 处理
- 数据库查询使用 Knex 链式调用，复杂事务用 `db.transaction()`

### 认证与权限

- JWT token 在 `Authorization: Bearer <token>` 头中传递
- 角色：`admin` > `maintenance`（维修） > `warehouse`（仓管） > `procurement`（采购）
- 中间件：`authenticate`（必须登录）、`requireRole(...roles)`（必须指定角色）
- 备份/恢复功能仅 `admin` 可访问

### 数据库

- migrations 使用 Knex schema 构建，每次容器启动自动运行 `db.migrate.latest()`
- seeds 仅在数据库为空时运行（`setup.js` 中检查 `users` 表）
- 所有表使用自增 id 主键
- 表名使用 snake_case 复数形式

### 编号规则

- 备件编号：`P{YYYYMMDD}{XXX}`（日期 + 3 位流水，如 `P20260515001`）
- 设备编号：`E{YYYYMMDD}{XXX}`（日期 + 3 位流水，如 `E20260515001`）
- 工具编号：自由格式，导入时手动指定

### API 风格

- RESTful，资源名称用复数（`/api/parts`, `/api/tools`）
- 错误响应格式：`{ error: "错误描述" }`
- 成功响应格式：直接返回 JSON 数据或 `{ success: true }`

## 运行方式

### Docker 部署（推荐）

```bash
cd heating-supply-app
docker compose up -d --build
```

访问 http://localhost:3001（映射 server:3000）

### 本地开发

后端：`cd server && npm run dev`（端口 3000）
前端：`cd client && npm run dev`（端口 5173，代理到 3000）

## 演示账号

| 用户名 | 密码 | 角色 | 姓名 |
|--------|------|------|------|
| weixiu1 | 123456 | maintenance | 张三 |
| weixiu2 | 123456 | maintenance | 李四 |
| cangku1 | 123456 | warehouse | 王仓管 |
| caigou1 | 123456 | procurement | 赵采购 |
|admin | admin123 | admin | 系统管理员 |

## 重要注意事项

1. **数据持久化**: 数据库卷 `pgdata` 保持数据，重新 `docker compose up -d --build` 不会清空用户数据
2. **种子数据**: 仅在首次部署时插入，后续不会覆盖已有数据
3. **全中文**: 所有 UI 文本、错误提示、注释使用中文
4. **修改原则**: 保持与现有代码风格一致，不做不相关的重构
