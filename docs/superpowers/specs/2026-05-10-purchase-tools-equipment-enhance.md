# 采购工具、备件库存显示 & 设备级联选择设计

## 概述

为供热公司备件采购维修 App 增加：采购订单支持采购工具、设备台账显示关联备件库存、设备选择改为先选系统再选设备的级联方式。

## 1. 采购工具

### 数据模型

`purchase_order_items` 表新增字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `item_type` | varchar(10) DEFAULT 'part' | 'part' 表示备件，'tool' 表示工具 |
| `tool_id` | integer, FK→tools(id), nullable | 当 item_type='tool' 时关联工具 |

- `part_id` 改为 nullable（工具项无 part_id）
- 备件项必须有 part_id，工具项必须有 tool_id

### 后端变更

**purchasesController.js**：
- **create/update**：根据 `item_type` 判断写入 `part_id` 或 `tool_id`
- **list/getById**：items 数据中增加工具信息（code、name、model），通过 LEFT JOIN tools 表
- **arrival（到货登记）**：备件到货按现有逻辑生成 inbound_records + stock_records；工具到货只记录 `arrived_quantity`，不生成库存记录

### 前端变更

**PurchaseForm.jsx**：
- 明细项增加"类型"切换（备件/工具）
- 选择备件时：显示原有的备件选择器
- 选择工具时：显示工具选择器（从 `/api/tools` 获取列表）

**PurchaseDetail.jsx**：
- 明细表增加"类型"列（Tag 显示备件/工具）
- 工具项显示工具编码、名称、型号

**ArrivalForm.jsx**：
- 工具项不显示库位选择器（工具不按库存数量管理）
- 仍可填写到货数量

## 2. 设备级联选择

### 涉及页面

| 页面 | 字段 | 说明 |
|------|------|------|
| WorkOrderForm | equipment_id（单选） | 选择工单关联的设备 |
| PartForm | equipment_ids（多选） | 选择备件关联的设备 |

### 实现方式

**数据准备**（两个页面通用）：
- 获取系统分类列表：`GET /api/system-categories`（已有的 tree 接口）
- 获取设备列表：`GET /api/equipment`（已有的 list 接口，包含 system_category_id）

**UI 交互**：
```
系统分类: [Select 下拉，可选，含"全部"选项]
关联设备: [Select，根据所选系统分类过滤]
```

- 系统分类选择器：下拉显示所有系统分类，第一项为"全部系统"
- 设备选择器：监听 system_category_id 变化，过滤显示对应系统的设备
- 不选系统时显示全部设备（兼容现有行为）

### 设备列表增强

- EquipmentList 页面已有 system_name 列，无需额外变更
- 设备已按 system_category_id 分类

## 3. 设备台账关联备件库存

### 设备列表（EquipmentList）

表格新增一列"关联备件数"，显示该设备关联的备件种类数量。

后端 `equipmentController.list` 已返回 `related_parts` 数组，只需在前端渲染 `related_parts.length`。

### 设备详情（EquipmentDetail）

在"关联备件"区域，为每个备件增加"当前库存"字段。

实现方式：
- 备件列表已有，新增库存查询：通过 `/api/inventory` 或直接查 `stock_records` 表获取各备件总库存
- 后端 equipmentController.getById 中增加库存汇总逻辑：

```javascript
// 查询所有关联备件的库存总量
const partIds = relatedParts.map(p => p.id);
const stockCounts = await db('stock_records')
  .select('part_id')
  .sum('quantity as total_quantity')
  .whereIn('part_id', partIds)
  .groupBy('part_id');
```

- 前端显示时，每个备件项增加"当前库存"列

## 4. 数据迁移

新建 migration 文件 `021_add_item_type_to_purchase_order_items.js`：

1. `purchase_order_items` 表新增 `item_type` 列（varchar(10), DEFAULT 'part', NOT NULL）
2. `purchase_order_items` 表新增 `tool_id` 列（integer, FK→tools(id), nullable）
3. `part_id` 改为 nullable（ALTER COLUMN）

## 文件变更

### 修改文件

| 文件 | 说明 |
|------|------|
| `server/db/migrations/021_add_item_type_to_purchase_order_items.js` | 新增迁移 |
| `server/src/controllers/purchasesController.js` | 采购支持工具（create/update/list/getById/arrival） |
| `client/src/pages/purchases/PurchaseForm.jsx` | 明细项增加工具选择 |
| `client/src/pages/purchases/PurchaseDetail.jsx` | 明细表增加工具信息 |
| `client/src/pages/purchases/ArrivalForm.jsx` | 工具项不显示库位 |
| `client/src/pages/basicData/EquipmentList.jsx` | 增加"关联备件数"列 |
| `client/src/pages/basicData/EquipmentDetail.jsx` | 关联备件显示库存 |
| `client/src/pages/workOrders/WorkOrderForm.jsx` | 设备选择改为级联 |
| `client/src/pages/parts/PartForm.jsx` | 设备选择改为级联 |
| `server/src/controllers/equipmentController.js` | getById 增加关联备件库存 |
