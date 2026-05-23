# 账号管理、权限、密码修改 & 人员管理设计

## 概述

为供热公司备件采购维修 App 增加人员管理、账号管理、基于角色的权限控制、密码修改功能。

## 1. 人员管理

### 数据模型

新增 `personnel` 表：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | serial PK | |
| name | varchar(100) NOT NULL | 姓名 |
| phone | varchar(20) | 手机号 |
| position | varchar(100) | 岗位 |
| hire_date | date | 入职日期 |
| status | varchar(20) DEFAULT 'active' | 在职/离职（active/resigned） |
| resignation_date | date | 离职日期 |
| notes | text | 备注 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### API

```
GET    /api/personnel          — 列表，支持 keyword 搜索（姓名/手机号），支持 ?status=active|resigned 过滤
GET    /api/personnel/:id      — 详情
POST   /api/personnel          — 新增
PUT    /api/personnel/:id      — 编辑（包括状态改为离职）
DELETE /api/personnel/:id      — 删除（仅限无关联账号的人员）
```

### 离职逻辑
- 人员状态改为 `resigned` 时，需填写 `resignation_date`
- 如果该人员关联了系统账号，自动将账号 `is_active` 设为 false
- 已离职人员仍可在列表中查看（默认过滤在职，可切换查看全部）

### 前端
- 基础数据下新增"人员管理"入口
- 表格：姓名、手机号、岗位、入职日期、状态（Tag 显示在职/离职）
- 新增/编辑弹窗：表单包含所有字段，离职日期仅在状态选"离职"时显示
- 表格上方有"在职/全部"切换

## 2. 账号管理

### users 表改造

在现有 `users` 表基础上：

| 变更 | 说明 |
|------|------|
| 新增 `personnel_id` | FK→personnel(id)，nullable，一个账号可选关联一个人员 |
| 新增 `is_active` | boolean, DEFAULT true，禁用账号时不删除 |
| 新增角色 `admin` | 在角色枚举中增加管理员 |

### 不允许物理删除用户
用户只做禁用（is_active = false），防止工单、出入库记录等数据关联断裂。

### API

```
现有：
POST   /api/auth/login           — 登录
GET    /api/auth/me              — 获取当前用户
POST   /api/auth/register        — 创建账号（增加 personnel_id 字段）
GET    /api/auth/users           — 用户列表（增加 personnel 关联信息）

新增：
PUT    /api/auth/change-password — 修改密码（body: current_password, new_password）
PUT    /api/auth/users/:id       — 编辑账号（role, personnel_id, is_active）
```

### 前端
- 基础数据下新增"账号管理"入口（仅 admin 角色可见）
- 表格：用户名、姓名、手机号、角色、关联人员、状态（启用/禁用）
- 编辑弹窗：可修改角色、关联人员、启用/禁用
- 新增账号时，关联人员下拉只显示在职人员

## 3. 权限控制

### requireRole 中间件

新增 `requireRole(...roles)` 中间件，校验当前用户角色是否在允许列表中：

```javascript
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: '未登录' });
    if (roles.includes(req.user.role)) return next();
    res.status(403).json({ error: '权限不足' });
  };
}
```

### 后端接口权限

| 接口 | 权限 |
|------|------|
| 人员管理 CRUD | 所有已登录用户 |
| 账号管理列表/编辑 | 仅 admin |
| 修改密码 | 所有已登录用户 |
| 创建账号 | 仅 admin |

### 前端菜单权限

- admin 角色：可以看到所有菜单
- 现有角色（maintenance/warehouse/procurement）：按 role 过滤菜单项（与当前一致）
- 账号管理菜单项：仅 admin 可见

## 4. 密码修改

### 后端
```
PUT /api/auth/change-password
body: { current_password, new_password }
```
- 验证当前密码是否正确
- 新密码加密后更新
- 返回成功消息

### 前端
- Profile 页增加"修改密码"按钮
- 弹窗：当前密码、新密码、确认新密码
- 前端校验新密码与确认密码一致

## 5. Seed 数据更新

### 新增人员记录
为每个现有用户创建对应的 personnel 记录：
- 张三 → maintenance, 李四 → maintenance, 王仓管 → warehouse, 赵采购 → procurement

### 新增 admin 账号
- 用户名：admin
- 密码：admin123
- 角色：admin
- 姓名：系统管理员
- 同时创建对应的 personnel 记录

## 6. 数据迁移

新建 migration 文件 `XXX_add_personnel_and_account_fields.js`：

1. 创建 `personnel` 表
2. 为现有 users 表中的每个用户创建对应的 personnel 记录（姓名、手机号）
3. 在 `users` 表新增 `personnel_id` 列和 FK 约束
4. 更新 users 表设置 personnel_id
5. 在 `users` 表新增 `is_active` 列（DEFAULT true）
6. 使用 raw SQL 在角色枚举中增加 `admin` 值
7. 创建 admin 用户和对应的 personnel 记录

## 文件变更

### 新增文件
| 文件 | 说明 |
|------|------|
| `server/db/migrations/XXX_add_personnel_and_account_fields.js` | 数据库迁移 |
| `server/src/controllers/personnelController.js` | 人员管理控制器 |
| `server/src/routes/personnel.js` | 人员管理路由 |
| `client/src/pages/basicData/PersonnelList.jsx` | 人员管理页面 |
| `client/src/pages/basicData/AccountList.jsx` | 账号管理页面 |

### 修改文件
| 文件 | 说明 |
|------|------|
| `server/src/middleware/auth.js` | 新增 requireRole |
| `server/src/controllers/authController.js` | 新增 changePassword, updateUser |
| `server/src/routes/auth.js` | 新增路由 |
| `server/src/index.js` | 挂载人员管理路由 |
| `server/db/seeds/seed_demo.js` | 新增 admin 账号和 personnel 数据 |
| `client/src/pages/Profile.jsx` | 增加修改密码功能 |
| `client/src/components/DesktopLayout.jsx` | 增加菜单项和角色过滤 |
| `client/src/components/MobileLayout.jsx` | 增加菜单项和角色过滤 |
| `client/src/App.jsx` | 增加路由 |
