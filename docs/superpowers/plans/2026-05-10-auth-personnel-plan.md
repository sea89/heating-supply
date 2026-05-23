# 账号管理、权限、密码修改 & 人员管理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现人员管理、账号管理、基于角色的权限控制、密码修改功能

**Architecture:** 新增 personnel 表（独立于 users），users 表增加 personnel_id 外键和 is_active 字段。新增 requireRole 中间件。后端新增 personnelController，扩展 authController。前端新增 PersonnelList/AccountList 页面，扩展 Profile 页面。

**Tech Stack:** Node.js/Express (knex+PostgreSQL), React/Ant Design

---

## 文件变更总览

### 新增文件
| 文件 | 说明 |
|------|------|
| `server/db/migrations/XXX_add_personnel_and_account_fields.js` | 数据库迁移 |
| `server/src/controllers/personnelController.js` | 人员管理 CRUD 控制器 |
| `server/src/routes/personnel.js` | 人员管理路由 |
| `client/src/pages/basicData/PersonnelList.jsx` | 人员管理页面 |
| `client/src/pages/basicData/AccountList.jsx` | 账号管理页面 |

### 修改文件
| 文件 | 说明 |
|------|------|
| `server/src/middleware/auth.js` | 新增 requireRole 中间件 |
| `server/src/controllers/authController.js` | 新增 changePassword, updateUser |
| `server/src/routes/auth.js` | 新增路由（change-password, updateUser） |
| `server/src/index.js` | 挂载人员管理路由 |
| `server/db/seeds/seed_demo.js` | 新增 admin 账号和 personnel 数据 |
| `client/src/pages/Profile.jsx` | 增加修改密码功能 |
| `client/src/components/DesktopLayout.jsx` | 增加菜单项和角色过滤 |
| `client/src/components/MobileLayout.jsx` | 增加菜单项和角色过滤 |
| `client/src/App.jsx` | 增加路由 |

---

## Task 1: 数据库迁移

**Files:**
- Create: `server/db/migrations/XXX_add_personnel_and_account_fields.js`

- [ ] **Step 1: 创建迁移文件**

创建文件 `server/db/migrations/XXX_add_personnel_and_account_fields.js`：

```javascript
export function up(knex) {
  return knex.schema
    // 1. 创建 personnel 表
    .createTable('personnel', (table) => {
      table.increments('id').primary();
      table.string('name', 100).notNullable();
      table.string('phone', 20);
      table.string('position', 100);
      table.date('hire_date');
      table.enu('status', ['active', 'resigned']).defaultTo('active').notNullable();
      table.date('resignation_date');
      table.text('notes');
      table.timestamps(true, true);
    })
    // 2. 给 users 表增加 personnel_id 和 is_active
    .then(() => knex.schema.alterTable('users', (table) => {
      table.integer('personnel_id').references('id').inTable('personnel').onDelete('SET NULL');
      table.boolean('is_active').defaultTo(true).notNullable();
    }))
    // 3. 为每个现有用户创建 personnel 记录
    .then(async () => {
      const users = await knex('users').select('id', 'name', 'phone');
      for (const user of users) {
        const [personnelId] = await knex('personnel').insert({
          name: user.name,
          phone: user.phone || null,
          position: '',
          status: 'active',
        }).returning('id');
        const pid = personnelId?.id ?? personnelId;
        await knex('users').where({ id: user.id }).update({ personnel_id: pid });
      }
    })
    // 4. 添加 admin 角色到枚举 (PostgreSQL ALTER TYPE)
    .then(() => knex.raw(`ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'admin'`))
    // 5. 创建 admin 用户和对应的 personnel 记录
    .then(async () => {
      const [adminPersonnelId] = await knex('personnel').insert({
        name: '系统管理员',
        phone: '',
        position: '系统管理员',
        status: 'active',
      }).returning('id');
      const pid = adminPersonnelId?.id ?? adminPersonnelId;
      // 使用 bcrypt 加密密码 "admin123"
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('admin123', 10);
      await knex('users').insert({
        username: 'admin',
        password_hash: hash,
        name: '系统管理员',
        role: 'admin',
        personnel_id: pid,
        is_active: true,
      });
    });
}

export function down(knex) {
  return knex.schema
    .alterTable('users', (table) => {
      table.dropColumn('personnel_id');
      table.dropColumn('is_active');
    })
    .then(() => knex.schema.dropTableIfExists('personnel'));
}
```

> **注意**：迁移文件中使用了 `require('bcryptjs')`，因为是 CJS 风格的 require 在 migration 文件中可正常使用（knex 内部处理）。如果不行，可在迁移中硬编码 admin 的 hash 值：`$2a$10$...`（提前用 bcrypt 生成）。

- [ ] **Step 2: 运行迁移**

```bash
cd /sessions/ecstatic-youthful-lovelace/mnt/superpowers-5.1.0/heating-supply-app/server
npx knex migrate:latest --knexfile db/knexfile.cjs
```

Expected: 迁移成功，personnel 表创建，users 表增加字段，已有用户关联到 personnel，admin 用户创建。

- [ ] **Step 3: 提交**

```bash
git add server/db/migrations/
git commit -m "feat: add personnel table and user account fields"
```

---

## Task 2: 后端 - requireRole 中间件

**Files:**
- Modify: `server/src/middleware/auth.js`

- [ ] **Step 1: 添加 requireRole 函数**

编辑 `server/src/middleware/auth.js`，在 `authenticate` 函数之后添加：

```javascript
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '未登录' });
    }
    if (roles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ error: '权限不足' });
  };
}
```

- [ ] **Step 2: 提交**

```bash
git add server/src/middleware/auth.js
git commit -m "feat: add requireRole middleware"
```

---

## Task 3: 后端 - 人员管理控制器

**Files:**
- Create: `server/src/controllers/personnelController.js`

- [ ] **Step 1: 创建人员管理控制器**

创建 `server/src/controllers/personnelController.js`：

```javascript
import db from '../config/database.js';

export const list = async (req, res, next) => {
  try {
    const { keyword, status } = req.query;
    let query = db('personnel').orderBy('name');

    if (status && status !== 'all') {
      query = query.where('status', status);
    }

    if (keyword) {
      query = query.where(function () {
        this.where('name', 'ilike', `%${keyword}%`)
          .orWhere('phone', 'ilike', `%${keyword}%`);
      });
    }

    const items = await query;
    res.json(items);
  } catch (err) { next(err); }
};

export const getById = async (req, res, next) => {
  try {
    const item = await db('personnel').where({ id: req.params.id }).first();
    if (!item) return res.status(404).json({ error: '人员不存在' });
    res.json(item);
  } catch (err) { next(err); }
};

export const create = async (req, res, next) => {
  try {
    const { name, phone, position, hire_date, notes } = req.body;
    const insertResult = await db('personnel').insert({
      name, phone, position, hire_date, notes,
    }).returning('id');
    const id = insertResult?.[0]?.id ?? insertResult?.id ?? insertResult;
    res.status(201).json({ id });
  } catch (err) { next(err); }
};

export const update = async (req, res, next) => {
  try {
    const existing = await db('personnel').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: '人员不存在' });

    const { name, phone, position, hire_date, status, resignation_date, notes } = req.body;

    const updateData = { name, phone, position, hire_date, status, resignation_date, notes };
    // 移除 undefined 字段
    Object.keys(updateData).forEach(k => { if (updateData[k] === undefined) delete updateData[k]; });

    if (Object.keys(updateData).length > 0) {
      await db('personnel').where({ id: req.params.id }).update(updateData);
    }

    // 如果状态改为离职，自动禁用关联账号
    if (status === 'resigned') {
      const user = await db('users').where({ personnel_id: req.params.id }).first();
      if (user) {
        await db('users').where({ id: user.id }).update({ is_active: false });
      }
    }

    // 如果状态改为在职，自动启用关联账号
    if (status === 'active') {
      const user = await db('users').where({ personnel_id: req.params.id }).first();
      if (user) {
        await db('users').where({ id: user.id }).update({ is_active: true });
      }
    }

    res.json({ success: true });
  } catch (err) { next(err); }
};

export const remove = async (req, res, next) => {
  try {
    const existing = await db('personnel').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: '人员不存在' });

    // 检查是否关联了账号
    const user = await db('users').where({ personnel_id: req.params.id }).first();
    if (user) {
      return res.status(400).json({ error: '该人员关联了系统账号，无法删除。请先解除关联' });
    }

    await db('personnel').where({ id: req.params.id }).del();
    res.json({ success: true });
  } catch (err) { next(err); }
};
```

- [ ] **Step 2: 提交**

```bash
git add server/src/controllers/personnelController.js
git commit -m "feat: personnel CRUD controller"
```

---

## Task 4: 后端 - 人员管理路由

**Files:**
- Create: `server/src/routes/personnel.js`
- Modify: `server/src/index.js`

- [ ] **Step 1: 创建路由文件**

创建 `server/src/routes/personnel.js`：

```javascript
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as ctrl from '../controllers/personnelController.js';

const router = Router();
router.get('/', authenticate, ctrl.list);
router.get('/:id', authenticate, ctrl.getById);
router.post('/', authenticate, ctrl.create);
router.put('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, ctrl.remove);

export default router;
```

- [ ] **Step 2: 在 index.js 中挂载**

编辑 `server/src/index.js`，在 import 区域增加：
```javascript
import personnelRoutes from './routes/personnel.js';
```

在 `app.use('/api/import-export', importExportRoutes);` 之后增加：
```javascript
app.use('/api/personnel', personnelRoutes);
```

- [ ] **Step 3: 提交**

```bash
git add server/src/routes/personnel.js server/src/index.js
git commit -m "feat: personnel routes"
```

---

## Task 5: 后端 - 扩展 authController

**Files:**
- Modify: `server/src/controllers/authController.js`

- [ ] **Step 1: 添加 changePassword 和 updateUser 函数**

编辑 `server/src/controllers/authController.js`，在文件末尾（`export` 之后）添加：

```javascript
export async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: '请提供当前密码和新密码' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: '新密码长度不能少于6位' });
    }

    const [user] = await db('users').where({ id: req.user.id });
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(400).json({ error: '当前密码错误' });

    const hash = await bcrypt.hash(new_password, 10);
    await db('users').where({ id: req.user.id }).update({ password_hash: hash });

    res.json({ message: '密码修改成功' });
  } catch (err) { next(err); }
}

export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { role, personnel_id, is_active } = req.body;

    const user = await db('users').where({ id }).first();
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const updateData = {};
    if (role !== undefined) updateData.role = role;
    if (personnel_id !== undefined) updateData.personnel_id = personnel_id;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (Object.keys(updateData).length > 0) {
      await db('users').where({ id }).update(updateData);
    }

    res.json({ success: true });
  } catch (err) { next(err); }
}
```

- [ ] **Step 2: 提交**

```bash
git add server/src/controllers/authController.js
git commit -m "feat: add changePassword and updateUser"
```

---

## Task 6: 后端 - 扩展 auth 路由

**Files:**
- Modify: `server/src/routes/auth.js`

- [ ] **Step 1: 添加新路由**

编辑 `server/src/routes/auth.js`，在 `router.get('/users', authenticate, listUsers);` 之后添加：

```javascript
import { requireRole } from '../middleware/auth.js';
import { changePassword, updateUser } from '../controllers/authController.js';

// 在 router.get('/users', ...) 之后增加
router.put('/change-password', authenticate, changePassword);
router.put('/users/:id', authenticate, requireRole('admin'), updateUser);
```

需要调整 import，把 changePassword 和 updateUser 从 controllers 导入。修改原有 import 行：

```javascript
import { login, getMe, createUser, listUsers, changePassword, updateUser } from '../controllers/authController.js';
```

- [ ] **Step 2: 提交**

```bash
git add server/src/routes/auth.js
git commit -m "feat: add change-password and update-user routes"
```

---

## Task 7: 前端 - PersonnelList 人员管理页面

**Files:**
- Create: `client/src/pages/basicData/PersonnelList.jsx`

- [ ] **Step 1: 创建人员管理页面**

```jsx
import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, DatePicker, Space, Tag, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../api/client';

export default function PersonnelList() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('active');
  const [keyword, setKeyword] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (keyword) params.set('keyword', keyword);
      const res = await api.get(`/api/personnel?${params.toString()}`);
      setData(res.data || []);
    } catch (err) {
      message.error(err.response?.data?.error || '获取人员列表失败');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, keyword]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAddModal = () => {
    setEditingRecord(null);
    setModalTitle('新增人员');
    form.resetFields();
    form.setFieldsValue({ status: 'active' });
    setModalVisible(true);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    setModalTitle('编辑人员');
    form.setFieldsValue({
      name: record.name,
      phone: record.phone,
      position: record.position,
      hire_date: record.hire_date ? dayjs(record.hire_date) : null,
      status: record.status,
      resignation_date: record.resignation_date ? dayjs(record.resignation_date) : null,
      notes: record.notes,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload = {
        ...values,
        hire_date: values.hire_date ? values.hire_date.format('YYYY-MM-DD') : null,
        resignation_date: values.resignation_date ? values.resignation_date.format('YYYY-MM-DD') : null,
      };

      if (editingRecord) {
        await api.put(`/api/personnel/${editingRecord.id}`, payload);
        message.success('更新成功');
      } else {
        await api.post('/api/personnel', payload);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchData();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.error || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      await api.delete(`/api/personnel/${record.id}`);
      message.success('删除成功');
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.error || '删除失败');
    }
  };

  const columns = [
    { title: '姓名', dataIndex: 'name', key: 'name', width: 120 },
    { title: '手机号', dataIndex: 'phone', key: 'phone', width: 130 },
    { title: '岗位', dataIndex: 'position', key: 'position' },
    {
      title: '入职日期',
      dataIndex: 'hire_date',
      key: 'hire_date',
      width: 120,
      render: (v) => v || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s) => (
        <Tag color={s === 'active' ? 'green' : 'red'}>
          {s === 'active' ? '在职' : '离职'}
        </Tag>
      ),
    },
    {
      title: '离职日期',
      dataIndex: 'resignation_date',
      key: 'resignation_date',
      width: 120,
      render: (v) => v || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => openEditModal(record)}>编辑</Button>
          <Popconfirm
            title="确认删除"
            description={`确定删除「${record.name}」吗？`}
            onConfirm={() => handleDelete(record)}
            okText="删除" cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="人员管理"
      extra={
        <Space>
          <Input.Search
            placeholder="搜索姓名/手机号"
            onSearch={(v) => setKeyword(v)}
            allowClear
            style={{ width: 200 }}
          />
          <Select
            value={statusFilter}
            onChange={(v) => setStatusFilter(v)}
            style={{ width: 100 }}
            options={[
              { label: '在职', value: 'active' },
              { label: '全部', value: 'all' },
              { label: '离职', value: 'resigned' },
            ]}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
            新增人员
          </Button>
        </Space>
      }
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
      />
      <Modal
        title={modalTitle}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={submitting}
        destroyOnClose
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item name="position" label="岗位">
            <Input placeholder="请输入岗位" />
          </Form.Item>
          <Form.Item name="hire_date" label="入职日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select
              options={[
                { label: '在职', value: 'active' },
                { label: '离职', value: 'resigned' },
              ]}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.status !== cur.status}>
            {({ getFieldValue }) =>
              getFieldValue('status') === 'resigned' ? (
                <Form.Item name="resignation_date" label="离职日期" rules={[{ required: true, message: '请选择离职日期' }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={3} placeholder="备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add client/src/pages/basicData/PersonnelList.jsx
git commit -m "feat: personnel list page"
```

---

## Task 8: 前端 - AccountList 账号管理页面

**Files:**
- Create: `client/src/pages/basicData/AccountList.jsx`

- [ ] **Step 1: 创建账号管理页面**

```jsx
import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Modal, Form, Select, Space, Tag, message, Switch } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import api from '../../api/client';

export default function AccountList() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/auth/users');
      setData(res.data || []);
    } catch (err) {
      message.error(err.response?.data?.error || '获取账号列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPersonnel = useCallback(async () => {
    try {
      const res = await api.get('/api/personnel?status=active');
      setPersonnel(res.data || []);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchPersonnel();
  }, [fetchData, fetchPersonnel]);

  const openEditModal = (record) => {
    setEditingRecord(record);
    form.setFieldsValue({
      role: record.role,
      personnel_id: record.personnel_id || undefined,
      is_active: record.is_active,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await api.put(`/api/auth/users/${editingRecord.id}`, values);
      message.success('更新成功');
      setModalVisible(false);
      fetchData();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.error || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const roleOptions = [
    { label: '管理员', value: 'admin' },
    { label: '维修人员', value: 'maintenance' },
    { label: '仓管人员', value: 'warehouse' },
    { label: '采购人员', value: 'procurement' },
  ];

  const roleColors = {
    admin: 'red',
    maintenance: 'blue',
    warehouse: 'green',
    procurement: 'orange',
  };
  const roleLabels = {
    admin: '管理员',
    maintenance: '维修',
    warehouse: '仓管',
    procurement: '采购',
  };

  const columns = [
    { title: '用户名', dataIndex: 'username', key: 'username', width: 120 },
    { title: '姓名', dataIndex: 'name', key: 'name', width: 100 },
    { title: '手机号', dataIndex: 'phone', key: 'phone', width: 130 },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (r) => <Tag color={roleColors[r]}>{roleLabels[r] || r}</Tag>,
    },
    {
      title: '关联人员',
      dataIndex: ['personnel', 'name'],
      key: 'personnel_name',
      render: (text, record) => record.personnel_name || '-',
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button type="link" size="small" icon={<EditOutlined />}
          onClick={() => openEditModal(record)}>编辑</Button>
      ),
    },
  ];

  return (
    <Card title="账号管理">
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
      />
      <Modal
        title="编辑账号"
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={submitting}
        destroyOnClose
        width={450}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select options={roleOptions} />
          </Form.Item>
          <Form.Item name="personnel_id" label="关联人员">
            <Select
              allowClear
              placeholder="选择关联人员"
              options={personnel.map((p) => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>
          <Form.Item name="is_active" label="启用账号" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add client/src/pages/basicData/AccountList.jsx
git commit -m "feat: account list page"
```

---

## Task 9: 前端 - Profile 页增加密码修改

**Files:**
- Modify: `client/src/pages/Profile.jsx`

- [ ] **Step 1: 增加修改密码功能**

编辑 `client/src/pages/Profile.jsx`：

在 import 区域增加：
```javascript
import { useState } from 'react';
import { Modal, Input, Form } from 'antd';
import { KeyOutlined } from '@ant-design/icons';
import api from '../api/client';
```

在函数组件 `Profile` 内增加：
```javascript
const [passwordModalVisible, setPasswordModalVisible] = useState(false);
const [passwordForm] = Form.useForm();
const [changingPassword, setChangingPassword] = useState(false);

const handleChangePassword = async () => {
  try {
    const values = await passwordForm.validateFields();
    setChangingPassword(true);
    await api.put('/api/auth/change-password', values);
    message.success('密码修改成功');
    setPasswordModalVisible(false);
    passwordForm.resetFields();
  } catch (err) {
    if (err.errorFields) return;
    message.error(err.response?.data?.error || '密码修改失败');
  } finally {
    setChangingPassword(false);
  }
};
```

在退出登录按钮上方或下方增加密码修改按钮：
```jsx
<Button
  type="default"
  icon={<KeyOutlined />}
  size="large"
  onClick={() => setPasswordModalVisible(true)}
  style={{ marginRight: 16 }}
>
  修改密码
</Button>
```

在 Card 末尾增加密码修改弹窗：
```jsx
<Modal
  title="修改密码"
  open={passwordModalVisible}
  onOk={handleChangePassword}
  onCancel={() => { setPasswordModalVisible(false); passwordForm.resetFields(); }}
  confirmLoading={changingPassword}
  destroyOnClose
>
  <Form form={passwordForm} layout="vertical">
    <Form.Item
      name="current_password"
      label="当前密码"
      rules={[{ required: true, message: '请输入当前密码' }]}
    >
      <Input.Password placeholder="请输入当前密码" />
    </Form.Item>
    <Form.Item
      name="new_password"
      label="新密码"
      rules={[
        { required: true, message: '请输入新密码' },
        { min: 6, message: '密码长度不能少于6位' },
      ]}
    >
      <Input.Password placeholder="请输入新密码" />
    </Form.Item>
    <Form.Item
      name="confirm_password"
      label="确认新密码"
      dependencies={['new_password']}
      rules={[
        { required: true, message: '请确认新密码' },
        ({ getFieldValue }) => ({
          validator(_, value) {
            if (!value || getFieldValue('new_password') === value) {
              return Promise.resolve();
            }
            return Promise.reject(new Error('两次输入的密码不一致'));
          },
        }),
      ]}
    >
      <Input.Password placeholder="请再次输入新密码" />
    </Form.Item>
  </Form>
</Modal>
```

- [ ] **Step 2: 提交**

```bash
git add client/src/pages/Profile.jsx
git commit -m "feat: add password change in profile page"
```

---

## Task 10: 前端 - DesktopLayout 菜单更新

**Files:**
- Modify: `client/src/components/DesktopLayout.jsx`

- [ ] **Step 1: 更新基础数据菜单**

编辑 `client/src/components/DesktopLayout.jsx`：

在 import 区域增加图标：
```javascript
import { TeamOutlined, UserOutlined } from '@ant-design/icons';
```

在 `basic-data` 菜单的 children 末尾增加：
```jsx
{ key: '/basic-data/personnel', label: '人员管理' },
// 账号管理仅 admin 可见
...(user?.role === 'admin' ? [{ key: '/basic-data/accounts', label: '账号管理', icon: <UserOutlined /> }] : []),
```

需要在组件内获取 `user`（已存在 `const { user, logout } = useAuth();`）。

- [ ] **Step 2: 提交**

```bash
git add client/src/components/DesktopLayout.jsx
git commit -m "feat: add personnel and account menu items"
```

---

## Task 11: 前端 - MobileLayout 菜单更新

**Files:**
- Modify: `client/src/components/MobileLayout.jsx`

- [ ] **Step 1: 读取 MobileLayout 并更新**

先读取现有 `MobileLayout.jsx` 文件，然后做类似 DesktopLayout 的修改——在基础数据 tab 中增加"人员管理"链接，对 admin 增加"账号管理"链接。

- [ ] **Step 2: 提交**

```bash
git add client/src/components/MobileLayout.jsx
git commit -m "feat: add personnel and account to mobile menu"
```

---

## Task 12: 前端 - 路由配置

**Files:**
- Modify: `client/src/App.jsx`

- [ ] **Step 1: 增加路由**

编辑 `client/src/App.jsx`，在 import 区域增加：
```javascript
const PersonnelList = React.lazy(() => import('./pages/basicData/PersonnelList'));
const AccountList = React.lazy(() => import('./pages/basicData/AccountList'));
```

在 basic data 路由区域增加：
```jsx
<Route path="basic-data/personnel" element={<PersonnelList />} />
<Route path="basic-data/accounts" element={<AccountList />} />
```

- [ ] **Step 2: 提交**

```bash
git add client/src/App.jsx
git commit -m "feat: add personnel and account routes"
```

---

## 自检

1. **Spec 覆盖：**
   - 人员管理 CRUD → Task 1 (migration), Task 3 (controller), Task 4 (routes), Task 7 (frontend)
   - 离职逻辑（自动禁用账号）→ Task 3 (update controller handles this)
   - 账号管理 + is_active → Task 1 (migration), Task 5-6 (controller/routes), Task 8 (frontend)
   - requireRole 中间件 → Task 2
   - 密码修改 → Task 5-6 (backend), Task 9 (frontend Profile)
   - admin 角色 → Task 1 (migration add to enum), Task 10-11 (menu visibility)
   - 菜单更新 → Task 10 (DesktopLayout), Task 11 (MobileLayout)
   - 路由更新 → Task 12

2. **占位符检查：** 无 TBD/TODO 占位符。MobileLayout 的具体修改需要读文件后确认，但已说明。

3. **类型一致性：** personnel_id 在 migration、controller、frontend 中一致使用；requireRole 在 Task 2 定义，在 Task 6 中使用；路由路径 `/basic-data/personnel` 和 `/basic-data/accounts` 在 Task 10/11/12 中一致。
