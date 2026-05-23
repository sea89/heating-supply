# 供热公司备件采购维修管理系统

供热公司内部使用的备件采购、库存管理和维修工单管理 Web 应用。

## 技术栈

- **前端**: React 18 + Vite 5 + Ant Design 5 + Tailwind CSS 3
- **后端**: Node.js 20 + Express 4
- **数据库**: PostgreSQL 16
- **ORM**: Knex.js 3 (migrations)
- **认证**: JWT
- **部署**: Docker + Nginx

## 功能模块

### 备件目录管理
- 备件分类（树形结构）
- 备件基本信息（编号、名称、型号、规格、单位）
- 关联供应商、关联设备
- 库存上下限预警

### 库存管理
- 库存总览与明细查询
- 入库登记（支持批量）
- 出库登记（支持批量，含库存校验）
- 出入库流水查询
- 库位管理（仓库→货架→库位树形管理）
- 库位调拨

### 工具管理
- 工具台账（编号、名称、型号、状态）
- 工具借用（支持内部人员/外部人员）
- 工具归还（自动检测损坏进入维修状态）
- 借用记录查询

### 采购管理
- 采购申请单创建
- 采购单状态跟踪（待采购→已采购→部分到货→已完成）
- 到货登记（自动入库）

### 维修工单管理
- 工单创建（关联设备、所需备件）
- 工单状态跟踪（待处理→进行中→已完成）
- 工单完结（记录维修结果）

### 基础数据
- 系统分类管理
- 设备台账
- 供应商管理

## 本地开发

### 前置条件

- Node.js 20+
- PostgreSQL 16+
- npm

### 数据库初始化

```bash
# 创建数据库
createdb heating_supply

# 运行迁移
cd server
cp .env.example .env
npm install
npx knex migrate:latest --knexfile db/knexfile.js

# 导入种子数据（可选）
npx knex seed:run --knexfile db/knexfile.js
```

### 启动后端

```bash
cd server
npm run dev
```

### 启动前端

```bash
cd client
npm install
npm run dev
```

前端默认运行在 http://localhost:5173，API 请求代理到 http://localhost:3000。

## Docker 部署

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

访问 http://localhost 即可使用。

## 演示账号

| 用户名 | 密码 | 角色 | 姓名 | 说明 |
|--------|------|------|------|------|
| weixiu1 | 123456 | maintenance | 张三 | 维修人员 |
| weixiu2 | 123456 | maintenance | 李四 | 维修人员 |
| cangku1 | 123456 | warehouse | 王仓管 | 仓库管理员 |
| caigou1 | 123456 | procurement | 赵采购 | 采购人员 |

## 项目结构

```
heating-supply-app/
├── server/                 # 后端
│   ├── src/
│   │   ├── controllers/    # API 控制器
│   │   ├── routes/         # 路由
│   │   ├── middleware/     # 中间件
│   │   └── config/         # 配置
│   └── db/
│       ├── migrations/     # 数据库迁移
│       └── seeds/          # 种子数据
├── client/                 # 前端
│   └── src/
│       ├── pages/          # 页面
│       ├── components/     # 公共组件
│       ├── context/        # React Context
│       └── api/            # API 客户端
├── nginx/                  # Nginx 配置
├── docker-compose.yml
└── README.md
```
