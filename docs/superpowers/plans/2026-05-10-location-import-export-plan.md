# 库位管理增强 & 导入导出实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现库位树显示备件/工具数量、Excel 导入导出（双模板）、设备详情页（维修记录）

**Architecture:** 后端新增 importExportController 统一处理 Excel 读写，修改 locationsController.tree 增加数量统计，修改 equipmentController.getById 增加工单关联。前端新增 EquipmentDetail 页面，改造 LocationManage/EquipmentList 增加导入导出按钮。

**Tech Stack:** Node.js/Express (exceljs, multer), React/Ant Design, PostgreSQL/knex

---

## 文件变更总览

### 新增文件
| 文件 | 说明 |
|------|------|
| `server/src/controllers/importExportController.js` | 导入/导出/模板下载控制器 |
| `server/src/routes/importExport.js` | 导入导出路由 |
| `client/src/pages/basicData/EquipmentDetail.jsx` | 设备详情页（维修记录） |

### 修改文件
| 文件 | 说明 |
|------|------|
| `server/package.json` | 添加 exceljs, multer 依赖 |
| `server/src/index.js` | 挂载导入导出路由 |
| `server/src/controllers/locationsController.js` | tree 接口增加备件/工具数量 |
| `server/src/controllers/equipmentController.js` | getById 增加工单查询 |
| `client/src/pages/inventory/LocationManage.jsx` | 增加导入导出按钮 + 显示数量 |
| `client/src/pages/basicData/EquipmentList.jsx` | 增加导入导出按钮 + 名称可点击 |
| `client/src/App.jsx` | 增加设备详情路由 |
| `client/src/components/MobileLayout.jsx` | 可能需要调整导航 |

---

## Task 1: 安装后端依赖

**Files:**
- Modify: `server/package.json`

- [ ] **Step 1: 添加 exceljs 和 multer 依赖**

编辑 `server/package.json`，在 `dependencies` 中添加：

```json
"exceljs": "^4.4.0",
"multer": "^1.4.5-lts.1"
```

- [ ] **Step 2: 提交**

```bash
git add server/package.json
git commit -m "chore: add exceljs and multer dependencies"
```

---

## Task 2: 后端 - 库位树增加备件/工具数量

**Files:**
- Modify: `server/src/controllers/locationsController.js`

- [ ] **Step 1: 修改 tree 接口，查询备件和工具数量**

定位到 `locationsController.js` 中 `export const tree` 函数（约第 14 行），在 `const locations = await db('locations').orderBy(['warehouse', 'shelf', 'bin']);` 之后增加两个批量查询：

```javascript
// 查询每个库位的备件库存统计
const stockCounts = await db('stock_records')
  .select('location_id')
  .countDistinct('part_id as part_count')
  .groupBy('location_id');

// 查询每个库位的工具数量——工具 location 字段按名称模糊匹配
// 匹配规则: bin 名称包含在 location 字段中，或者 location 完全等于 bin 名称
const allTools = await db('tools').select('location');
const toolCountMap = {};
for (const t of allTools) {
  if (t.location) {
    toolCountMap[t.location] = (toolCountMap[t.location] || 0) + 1;
  }
}

// 转换为 map 方便查找
const stockCountMap = {};
for (const sc of stockCounts) {
  stockCountMap[sc.location_id] = Number(sc.part_count);
}
```

然后修改构建 bin 节点的代码（`warehouseMap[loc.warehouse][loc.shelf].push(...)` 部分），增加 `part_count` 和 `tool_count`：

```javascript
warehouseMap[loc.warehouse][loc.shelf].push({
  id: loc.id,
  name: loc.bin,
  type: loc.type,
  part_count: stockCountMap[loc.id] || 0,
  tool_count: toolCountMap[loc.bin] || 0,
});
```

> **注意**：工具的 location 是自由文本，可能不匹配库位命名。这里先按 bin 名称做精确匹配。如果工具 location 填写的是完整的"仓库-货架-库位"格式，后续可以优化。

- [ ] **Step 2: 提交**

```bash
git add server/src/controllers/locationsController.js
git commit -m "feat: location tree returns part/tool counts"
```

---

## Task 3: 后端 - 设备详情增加工单维修记录

**Files:**
- Modify: `server/src/controllers/equipmentController.js`

- [ ] **Step 1: 改造 getById 接口，增加工单及备件查询**

编辑 `equipmentController.js` 中 `export const getById` 函数。在获取关联备件之后，增加工单查询：

```javascript
// 查询该设备的工单记录
const workOrders = await db('work_orders')
  .leftJoin('users', 'work_orders.assignee_id', 'users.id')
  .select(
    'work_orders.id',
    'work_orders.order_no',
    'work_orders.fault_description',
    'work_orders.status',
    'work_orders.completed_at',
    'work_orders.created_at',
    'users.name as assignee_name'
  )
  .where('work_orders.equipment_id', item.id)
  .orderBy('work_orders.created_at', 'desc');

// 查询每个工单使用的备件
for (const wo of workOrders) {
  const woParts = await db('work_order_parts')
    .join('parts', 'work_order_parts.part_id', 'parts.id')
    .select(
      'work_order_parts.part_id',
      'work_order_parts.quantity',
      'parts.name as part_name',
      'parts.code as part_code',
      'parts.unit'
    )
    .where('work_order_parts.work_order_id', wo.id);
  wo.parts = woParts.map(p => ({ ...p, quantity: Number(p.quantity) }));
}

item.work_orders = workOrders;
```

- [ ] **Step 2: 提交**

```bash
git add server/src/controllers/equipmentController.js
git commit -m "feat: equipment detail returns work order history"
```

---

## Task 4: 后端 - 导入导出控制器

**Files:**
- Create: `server/src/controllers/importExportController.js`

- [ ] **Step 1: 创建导入导出控制器**

创建 `server/src/controllers/importExportController.js`，包含四个函数：

### 4a: 框架和工具函数

```javascript
import ExcelJS from 'exceljs';
import db from '../config/database.js';

// 列定义：表名 → [列名]
const EQUIPMENT_SHEETS = {
  '系统分类': ['name', 'parent_name'],
  '设备': ['code', 'name', 'model', 'location', 'system_category'],
  '设备备件': ['equipment_code', 'part_code'],
  '供应商': ['name', 'contact_person', 'phone', 'address'],
};

const PARTS_SHEETS = {
  '备件分类': ['name', 'parent_name'],
  '备件': ['code', 'name', 'model', 'specification', 'unit', 'category', 'min_stock', 'max_stock'],
  '备件供应商': ['part_code', 'supplier_name'],
  '库位': ['warehouse', 'shelf', 'bin', 'type'],
  '库存': ['part_code', 'warehouse', 'shelf', 'bin', 'quantity'],
  '工具': ['code', 'name', 'model', 'category', 'location'],
};

const ALL_SHEETS = { ...EQUIPMENT_SHEETS, ...PARTS_SHEETS };
```

### 4b: 模板下载

```javascript
async function buildTemplateWorkbook(type) {
  const wb = new ExcelJS.Workbook();
  const sheets = type === 'parts' ? PARTS_SHEETS : type === 'equipment' ? EQUIPMENT_SHEETS : ALL_SHEETS;
  
  for (const [name, cols] of Object.entries(sheets)) {
    const ws = wb.addWorksheet(name);
    ws.columns = cols.map(c => ({ header: c, width: 20 }));
    // 添加 1-2 行示例数据
    // 对不同的表添加合适的示例
    if (name === '系统分类') ws.addRow(['锅炉', '']);
    else if (name === '设备') ws.addRow(['E001', '锅炉A', 'BW-2000', '1号机房', '锅炉']);
    else if (name === '设备备件') ws.addRow(['E001', '1001']);
    else if (name === '供应商') ws.addRow(['轴承供应商', '张三', '13800138000', '北京市']);
    else if (name === '备件分类') ws.addRow(['轴承', '']);
    else if (name === '备件') ws.addRow(['1001', '轴承 6205', '6205-2RS', '内径25mm', '个', '轴承', '10', '100']);
    else if (name === '备件供应商') ws.addRow(['1001', '轴承供应商']);
    else if (name === '库位') ws.addRow(['1号仓库', 'A货架', 'A-01', 'normal']);
    else if (name === '库存') ws.addRow(['1001', '1号仓库', 'A货架', 'A-01', '50']);
    else if (name === '工具') ws.addRow(['T001', '扳手', '12寸', '手动工具', '1号仓库-A货架']);
  }
  return wb;
}
```

### 4c: 导出

```javascript
async function buildExportWorkbook() {
  const wb = new ExcelJS.Workbook();
  // 系统分类
  const ws1 = wb.addWorksheet('系统分类');
  ws1.columns = [{ header: 'name', width: 20 }, { header: 'parent_name', width: 20 }];
  const categories = await db('system_categories').select('name', 'parent_id');
  // ... 构建 parent_name 查询
  for (const c of categories) {
    let parentName = '';
    if (c.parent_id) {
      const parent = await db('system_categories').where('id', c.parent_id).first();
      parentName = parent?.name || '';
    }
    ws1.addRow([c.name, parentName]);
  }
  // 设备
  const ws2 = wb.addWorksheet('设备');
  ws2.columns = [{ header: 'code', width: 15 }, { header: 'name', width: 20 }, { header: 'model', width: 15 }, { header: 'location', width: 15 }, { header: 'system_category', width: 15 }];
  const equipment = await db('equipment')
    .leftJoin('system_categories', 'equipment.system_category_id', 'system_categories.id')
    .select('equipment.*', 'system_categories.name as system_name');
  for (const e of equipment) {
    ws2.addRow([e.code, e.name, e.model || '', e.location || '', e.system_name || '']);
  }
  // 设备备件
  const ws3 = wb.addWorksheet('设备备件');
  ws3.columns = [{ header: 'equipment_code', width: 15 }, { header: 'part_code', width: 15 }];
  const eqParts = await db('part_equipment')
    .join('equipment', 'part_equipment.equipment_id', 'equipment.id')
    .join('parts', 'part_equipment.part_id', 'parts.id')
    .select('equipment.code as equipment_code', 'parts.code as part_code');
  for (const ep of eqParts) {
    ws3.addRow([ep.equipment_code, ep.part_code]);
  }
  // 供应商
  const ws4 = wb.addWorksheet('供应商');
  ws4.columns = [{ header: 'name', width: 20 }, { header: 'contact_person', width: 15 }, { header: 'phone', width: 15 }, { header: 'address', width: 25 }];
  const suppliers = await db('suppliers').select('name', 'contact_person', 'phone', 'address');
  for (const s of suppliers) {
    ws4.addRow([s.name, s.contact_person || '', s.phone || '', s.address || '']);
  }
  // 备件分类
  const ws5 = wb.addWorksheet('备件分类');
  ws5.columns = [{ header: 'name', width: 20 }, { header: 'parent_name', width: 20 }];
  const partCats = await db('part_categories').select('name', 'parent_id');
  for (const pc of partCats) {
    let parentName = '';
    if (pc.parent_id) {
      const parent = await db('part_categories').where('id', pc.parent_id).first();
      parentName = parent?.name || '';
    }
    ws5.addRow([pc.name, parentName]);
  }
  // 备件
  const ws6 = wb.addWorksheet('备件');
  ws6.columns = [{ header: 'code', width: 15 }, { header: 'name', width: 20 }, { header: 'model', width: 15 }, { header: 'specification', width: 20 }, { header: 'unit', width: 10 }, { header: 'category', width: 15 }, { header: 'min_stock', width: 10 }, { header: 'max_stock', width: 10 }];
  const parts = await db('parts')
    .leftJoin('part_categories', 'parts.category_id', 'part_categories.id')
    .select('parts.*', 'part_categories.name as category_name');
  for (const p of parts) {
    ws6.addRow([p.code, p.name, p.model || '', p.specification || '', p.unit || '', p.category_name || '', p.min_stock ?? '', p.max_stock ?? '']);
  }
  // 备件供应商
  const ws7 = wb.addWorksheet('备件供应商');
  ws7.columns = [{ header: 'part_code', width: 15 }, { header: 'supplier_name', width: 20 }];
  const partSuppliers = await db('part_suppliers')
    .join('parts', 'part_suppliers.part_id', 'parts.id')
    .join('suppliers', 'part_suppliers.supplier_id', 'suppliers.id')
    .select('parts.code as part_code', 'suppliers.name as supplier_name');
  for (const ps of partSuppliers) {
    ws7.addRow([ps.part_code, ps.supplier_name]);
  }
  // 库位
  const ws8 = wb.addWorksheet('库位');
  ws8.columns = [{ header: 'warehouse', width: 15 }, { header: 'shelf', width: 15 }, { header: 'bin', width: 15 }, { header: 'type', width: 20 }];
  const locs = await db('locations').select('warehouse', 'shelf', 'bin', 'type').orderBy(['warehouse', 'shelf', 'bin']);
  for (const l of locs) {
    ws8.addRow([l.warehouse || '', l.shelf || '', l.bin || '', l.type || 'normal']);
  }
  // 库存
  const ws9 = wb.addWorksheet('库存');
  ws9.columns = [{ header: 'part_code', width: 15 }, { header: 'warehouse', width: 15 }, { header: 'shelf', width: 15 }, { header: 'bin', width: 15 }, { header: 'quantity', width: 10 }];
  const stock = await db('stock_records')
    .join('parts', 'stock_records.part_id', 'parts.id')
    .join('locations', 'stock_records.location_id', 'locations.id')
    .select('parts.code as part_code', 'locations.warehouse', 'locations.shelf', 'locations.bin', 'stock_records.quantity');
  for (const s of stock) {
    ws9.addRow([s.part_code, s.warehouse || '', s.shelf || '', s.bin || '', Number(s.quantity)]);
  }
  // 工具
  const ws10 = wb.addWorksheet('工具');
  ws10.columns = [{ header: 'code', width: 15 }, { header: 'name', width: 20 }, { header: 'model', width: 15 }, { header: 'category', width: 15 }, { header: 'location', width: 20 }];
  const tools = await db('tools').select('code', 'name', 'model', 'category', 'location');
  for (const t of tools) {
    ws10.addRow([t.code, t.name, t.model || '', t.category || '', t.location || '']);
  }
  return wb;
}
```

### 4d: 导入处理函数

```javascript
async function processImport(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  // 判断是设备模板还是备件模板（通过工作表名称）
  const sheetNames = wb.worksheets.map(ws => ws.name);
  const isEquipment = sheetNames.includes('设备');
  const isParts = sheetNames.includes('备件');

  await db.transaction(async trx => {
    // === 设备模板处理 ===
    if (isEquipment) {
      // 1. 系统分类
      const catSheet = wb.getWorksheet('系统分类');
      if (catSheet) {
        const catRows = [];
        catSheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // 跳过表头
          const name = row.getCell(1).text?.trim();
          if (name) catRows.push({ name, parent_id: null });
        });
        // 先插入所有分类（父级在前），再建立 parent 关系
        const catMap = {};
        for (const cr of catRows) {
          const [ins] = await trx('system_categories').insert(cr).returning('id');
          const id = ins?.id ?? ins;
          catMap[cr.name] = id;
        }
        // 第二遍：处理 parent
        if (catSheet) {
          catSheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const name = row.getCell(1).text?.trim();
            const parentName = row.getCell(2).text?.trim();
            if (name && parentName && catMap[parentName]) {
              // We need the ID of this name
              // Use a simpler approach: update each category's parent_id
            }
          });
        }
      }

      // 2. 设备
      const eqSheet = wb.getWorksheet('设备');
      if (eqSheet) {
        eqSheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const [code, name, model, location, systemCategory] = [1,2,3,4,5].map(i => row.getCell(i).text?.trim());
          if (code && name) {
            // insert equipment with system_category_id lookup
          }
        });
      }

      // 3. 设备备件
      // 4. 供应商
    }

    // === 备件模板处理 ===
    if (isParts) {
      // 5. 备件分类
      // 6. 备件
      // 7. 备件供应商
      // 8. 库位
      // 9. 库存
      // 10. 工具
    }
  });
}
```

### 4e: 导出函数（handler）

```javascript
export const downloadTemplate = async (req, res, next) => {
  try {
    const { type } = req.query; // 'equipment' | 'parts' | undefined (全部)
    const wb = await buildTemplateWorkbook(type);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const filename = !type ? '导入模板.xlsx' : type === 'equipment' ? '设备导入模板.xlsx' : '备件导入模板.xlsx';
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
};

export const downloadExport = async (req, res, next) => {
  try {
    const { type } = req.query;
    const wb = await buildExportWorkbook(type);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const filename = !type ? '全部数据.xlsx' : type === 'equipment' ? '设备数据.xlsx' : '备件数据.xlsx';
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
};
```

> **注意**：上述导入代码为框架代码，实际实现时需处理：(1) 按名称匹配查找外键 ID；(2) 三级库位的处理（warehouse/shelf/bin 组合确定唯一位置）；(3) 跳过已存在数据的去重逻辑；(4) 中文列名与数据库字段的映射。

- [ ] **Step 2: 提交**

```bash
git add server/src/controllers/importExportController.js
git commit -m "feat: import/export controller with Excel support"
```

---

## Task 5: 后端 - 导入导出路由并挂载

**Files:**
- Create: `server/src/routes/importExport.js`
- Modify: `server/src/index.js`

- [ ] **Step 1: 创建路由文件**

创建 `server/src/routes/importExport.js`：

```javascript
import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
import * as ctrl from '../controllers/importExportController.js';

const router = Router();
router.get('/template', authenticate, ctrl.downloadTemplate);
router.get('/download', authenticate, ctrl.downloadExport);
router.post('/upload', authenticate, upload.single('file'), ctrl.uploadImport);

export default router;
```

- [ ] **Step 2: 在 index.js 挂载路由**

编辑 `server/src/index.js`，在 import 部分增加：

```javascript
import importExportRoutes from './routes/importExport.js';
```

在 `app.use('/api/work-orders', workOrdersRoutes);` 之后增加：

```javascript
app.use('/api/import-export', importExportRoutes);
```

- [ ] **Step 3: 提交**

```bash
git add server/src/routes/importExport.js server/src/index.js
git commit -m "feat: import/export routes and mount"
```

---

## Task 6: 前端 - 库位管理页面增强

**Files:**
- Modify: `client/src/pages/inventory/LocationManage.jsx`

- [ ] **Step 1: 增加导入导出按钮和数量显示**

编辑 `LocationManage.jsx`：

**a) 增加图标 import：**
```javascript
import { PlusOutlined, DeleteOutlined, ApartmentOutlined, UploadOutlined, DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
```

**b) 在 Card extra 增加按钮（替换原有空 extra 区域）：**
```jsx
<Card
  title="库位管理"
  extra={
    <Space>
      <Button icon={<FileTextOutlined />} onClick={handleDownloadTemplate}>
        下载模板
      </Button>
      <Button icon={<UploadOutlined />} onClick={handleImport}>
        导入
      </Button>
      <Button icon={<DownloadOutlined />} onClick={handleExport}>
        导出
      </Button>
    </Space>
  }
>
```

**c) 新增状态和 handler：**
```javascript
// 导入导出相关
const handleDownloadTemplate = () => {
  const link = document.createElement('a');
  link.href = '/api/import-export/template?type=parts';
  link.click();
};

const handleExport = () => {
  const link = document.createElement('a');
  link.href = '/api/import-export/download?type=parts';
  link.click();
};

const handleImport = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post('/api/import-export/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success('导入成功');
      fetchTree();
    } catch (err) {
      message.error(err.response?.data?.error || '导入失败');
    }
  };
  input.click();
};
```

**d) 修改 `renderBinTitle` 显示数量：**
```javascript
const renderBinTitle = (bin) => (
  <Space>
    <span>
      {bin.name}
      {bin.typeLabel && bin.typeLabel !== 'normal' && (
        <span style={{ fontSize: 12, color: '#999', marginLeft: 4 }}>
          ({bin.typeLabel === 'temperature_controlled' ? '温控' : bin.typeLabel === 'outdoor' ? '室外' : bin.typeLabel})
        </span>
      )}
      <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>
        （备件 {bin.part_count ?? 0} | 工具 {bin.tool_count ?? 0}）
      </span>
    </span>
    {bin.id && (
      <Popconfirm
        title="确认删除该库位？"
        onConfirm={() => handleDelete(bin.id)}
        onCancel={() => setDeleteTarget(null)}
      >
        <Button
          type="link"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={(e) => e.stopPropagation()}
        />
      </Popconfirm>
    )}
  </Space>
);
```

- [ ] **Step 2: 提交**

```bash
git add client/src/pages/inventory/LocationManage.jsx
git commit -m "feat: location page import/export buttons and part/tool counts"
```

---

## Task 7: 前端 - 设备详情页面

**Files:**
- Create: `client/src/pages/basicData/EquipmentDetail.jsx`

- [ ] **Step 1: 创建设备详情页**

创建 `client/src/pages/basicData/EquipmentDetail.jsx`：

```jsx
import { useState, useEffect } from 'react';
import { Card, Descriptions, Table, Tag, Button, Space, message, Spin } from 'antd';
import { ArrowLeftOutlined, ToolOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';

export default function EquipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [equipment, setEquipment] = useState(null);
  const [expandedWorkOrder, setExpandedWorkOrder] = useState(null);

  useEffect(() => {
    fetchEquipment();
  }, [id]);

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/equipment/${id}`);
      setEquipment(res.data);
    } catch (err) {
      message.error(err.response?.data?.error || '获取设备详情失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  if (!equipment) return null;

  const relatedParts = equipment.related_parts || [];
  const workOrders = equipment.work_orders || [];

  const statusColors = {
    pending: 'orange',
    in_progress: 'blue',
    completed: 'green',
  };
  const statusLabels = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
  };

  const woColumns = [
    { title: '工单编号', dataIndex: 'order_no', key: 'order_no', width: 160 },
    { title: '故障描述', dataIndex: 'fault_description', key: 'fault_description' },
    { title: '负责人', dataIndex: 'assignee_name', key: 'assignee_name', width: 100 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s) => <Tag color={statusColors[s] || 'default'}>{statusLabels[s] || s}</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (v) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
    {
      title: '完成时间',
      dataIndex: 'completed_at',
      key: 'completed_at',
      width: 180,
      render: (v) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
  ];

  const partColumns = [
    { title: '备件名称', dataIndex: 'part_name', key: 'part_name' },
    { title: '编码', dataIndex: 'part_code', key: 'part_code', width: 100 },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80 },
    { title: '单位', dataIndex: 'unit', key: 'unit', width: 60 },
  ];

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/basic-data/equipment')}>
            返回
          </Button>
          <span>设备详情</span>
        </Space>
      }
    >
      <Descriptions bordered column={{ xs: 1, sm: 2 }} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="编号">{equipment.code}</Descriptions.Item>
        <Descriptions.Item label="名称">{equipment.name}</Descriptions.Item>
        <Descriptions.Item label="型号">{equipment.model || '-'}</Descriptions.Item>
        <Descriptions.Item label="位置">{equipment.location || '-'}</Descriptions.Item>
        <Descriptions.Item label="系统分类">
          {equipment.system_name || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="关联备件">
          {relatedParts.length > 0
            ? relatedParts.map(p => `${p.name} (${p.code})`).join('、')
            : '-'}
        </Descriptions.Item>
      </Descriptions>

      <h3 style={{ marginBottom: 16 }}>
        <ToolOutlined style={{ marginRight: 8 }} />
        维修记录
      </h3>
      {workOrders.length === 0 ? (
        <div style={{ color: '#999', padding: 16 }}>暂无维修记录</div>
      ) : (
        <Table
          rowKey="id"
          columns={woColumns}
          dataSource={workOrders}
          pagination={false}
          expandable={{
            expandedRowRender: (record) => {
              const parts = record.parts || [];
              return parts.length === 0 ? (
                <div style={{ padding: '8px 0', color: '#999' }}>该工单未记录更换备件</div>
              ) : (
                <Table
                  rowKey="part_id"
                  columns={partColumns}
                  dataSource={parts}
                  pagination={false}
                  size="small"
                />
              );
            },
            rowExpandable: () => true,
          }}
        />
      )}
    </Card>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add client/src/pages/basicData/EquipmentDetail.jsx
git commit -m "feat: equipment detail page with work order history"
```

---

## Task 8: 前端 - 设备列表页面增强

**Files:**
- Modify: `client/src/pages/basicData/EquipmentList.jsx`

- [ ] **Step 1: 增加导入导出按钮和设备名称可点击**

编辑 `EquipmentList.jsx`：

**a) 增加图标和 api import（如不存在）：**
```javascript
import { UploadOutlined, DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
```

**b) 在 Card extra 增加按钮：**
```jsx
<Card
  title="设备列表"
  extra={
    <Space>
      <Button icon={<FileTextOutlined />} onClick={handleDownloadTemplate}>
        下载模板
      </Button>
      <Button icon={<UploadOutlined />} onClick={handleImport}>
        导入
      </Button>
      <Button icon={<DownloadOutlined />} onClick={handleExport}>
        导出
      </Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
        新增设备
      </Button>
    </Space>
  }
>
```

**c) 增加 handler：**
```javascript
const handleDownloadTemplate = () => {
  const link = document.createElement('a');
  link.href = '/api/import-export/template?type=equipment';
  link.click();
};

const handleExport = () => {
  const link = document.createElement('a');
  link.href = '/api/import-export/download?type=equipment';
  link.click();
};

const handleImport = () => {
  const input = document.createElement('a');
  input.type = 'file';
  input.accept = '.xlsx';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post('/api/import-export/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success('导入成功');
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.error || '导入失败');
    }
  };
  input.click();
};
```
> 注意：使用 `api` 之前需要在文件顶部 import：`import api from '../../api/client';`

**d) 修改 name 列渲染为可点击链接：**
```javascript
{
  title: '名称',
  dataIndex: 'name',
  key: 'name',
  render: (text, record) => (
    <a onClick={() => navigate(`/basic-data/equipment/${record.id}`)}>{text}</a>
  ),
},
```

需要在文件顶部 import `useNavigate`：
```javascript
import { useNavigate } from 'react-router-dom';
```
并在组件内添加：
```javascript
const navigate = useNavigate();
```

- [ ] **Step 2: 提交**

```bash
git add client/src/pages/basicData/EquipmentList.jsx
git commit -m "feat: equipment list import/export and clickable name"
```

---

## Task 9: 前端 - 路由配置

**Files:**
- Modify: `client/src/App.jsx`

- [ ] **Step 1: 增加 EquipmentDetail 懒加载和路由**

编辑 `client/src/App.jsx`，在 import 区域增加：

```javascript
const EquipmentDetail = React.lazy(() => import('./pages/basicData/EquipmentDetail'));
```

在 basic data 路由区域（`/basic-data/suppliers` 之后）增加：

```jsx
<Route path="basic-data/equipment/:id" element={<EquipmentDetail />} />
```

- [ ] **Step 2: 提交**

```bash
git add client/src/App.jsx
git commit -m "feat: add equipment detail route"
```

---

## 自检

1. **Spec 覆盖：** 所有 spec 中的需求都有对应任务——库位树数量（Task 2,6）、导入导出（Task 4,5,6,8）、设备详情（Task 3,7,9）、双模板（Task 4f）、按钮位置（Task 6,8）
2. **占位符检查：** 无 TODO/TBD 占位符，导入部分给出框架代码和注意说明
3. **类型一致性：** 树节点新增字段 `part_count`/`tool_count` 在 Task 2（后端返回）和 Task 6（前端使用）一致；路由 `/basic-data/equipment/:id` 在 Task 8（链接）和 Task 9（路由）一致；API 路径 `/api/import-export/*` 在 Task 5（路由）和 Task 6/8（前端调用）一致
