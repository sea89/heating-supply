# 采购工具、备件库存显示 & 设备级联选择实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task.

**Goal:** 采购订单支持采购工具、设备台账显示关联备件库存、设备选择改为先选系统再选设备的级联方式

**Architecture:** purchase_order_items 表新增 item_type/tool_id 字段实现工具采购，equipmentController 增加库存查询，前端级联选择器用于工单和备件表单

**Tech Stack:** Node.js/Express (knex+PostgreSQL), React/Ant Design

---

## 文件变更总览

### 新增文件
无

### 修改文件
| 文件 | 说明 |
|------|------|
| `server/db/migrations/021_add_item_type_to_purchase_order_items.js` | 新增迁移 |
| `server/src/controllers/purchasesController.js` | 采购支持工具 |
| `server/src/controllers/equipmentController.js` | getById 增加备件库存查询 |
| `client/src/pages/purchases/PurchaseForm.jsx` | 明细项增加工具选择 |
| `client/src/pages/purchases/PurchaseDetail.jsx` | 明细表增加工具信息 |
| `client/src/pages/purchases/ArrivalForm.jsx` | 工具项不显示库位 |
| `client/src/pages/basicData/EquipmentList.jsx` | 增加关联备件数列 |
| `client/src/pages/basicData/EquipmentDetail.jsx` | 关联备件显示库存 |
| `client/src/pages/workOrders/WorkOrderForm.jsx` | 设备选择改为级联 |
| `client/src/pages/parts/PartForm.jsx` | 设备选择改为级联 |

---

## Task 1: 数据库迁移

**Files:**
- Create: `server/db/migrations/021_add_item_type_to_purchase_order_items.js`

- [ ] **Step 1: 创建迁移文件**

```javascript
export function up(knex) {
  return knex.schema.table('purchase_order_items', (table) => {
    table.string('item_type', 10).defaultTo('part').notNullable();
    table.integer('tool_id').unsigned().references('id').inTable('tools').onDelete('SET NULL');
  }).then(async () => {
    // Make part_id nullable (PostgreSQL syntax)
    await knex.raw('ALTER TABLE purchase_order_items ALTER COLUMN part_id DROP NOT NULL');
  });
}

export function down(knex) {
  return knex.schema.table('purchase_order_items', (table) => {
    table.dropColumn('item_type');
    table.dropColumn('tool_id');
  });
}
```

- [ ] **Step 2: 复制到容器并运行**

```bash
docker cp "server\db\migrations\021_add_item_type_to_purchase_order_items.js" heating-supply-app-server-1:/app/db/migrations/021_add_item_type_to_purchase_order_items.js
docker exec heating-supply-app-server-1 node run-migrate.mjs
```

---

## Task 2: 后端 - purchasesController 支持工具采购

**Files:**
- Modify: `server/src/controllers/purchasesController.js`

- [ ] **Step 1: 修改 create 方法**

原 `items.map` 部分改为根据 `item_type` 决定写入 part_id 或 tool_id：

```javascript
// In create, replace the items mapping:
const orderItems = items.map(item => ({
  purchase_order_id: orderId,
  item_type: item.item_type || 'part',
  part_id: item.item_type === 'tool' ? null : item.part_id,
  tool_id: item.item_type === 'tool' ? item.tool_id : null,
  quantity: item.quantity,
}));
```

- [ ] **Step 2: 修改 update 方法**

同样替换 items mapping：

```javascript
// In update, replace the items mapping:
const orderItems = items.map(item => ({
  purchase_order_id: id,
  item_type: item.item_type || 'part',
  part_id: item.item_type === 'tool' ? null : item.part_id,
  tool_id: item.item_type === 'tool' ? item.tool_id : null,
  quantity: item.quantity,
}));
```

- [ ] **Step 3: 修改 getById 方法**

替换原有的 items 查询，改为 LEFT JOIN parts 和 tools：

```javascript
const items = await db('purchase_order_items')
  .leftJoin('parts', 'purchase_order_items.part_id', 'parts.id')
  .leftJoin('tools', 'purchase_order_items.tool_id', 'tools.id')
  .select(
    'purchase_order_items.id',
    'purchase_order_items.item_type',
    'purchase_order_items.part_id',
    'purchase_order_items.tool_id',
    'purchase_order_items.quantity',
    'purchase_order_items.arrived_quantity',
    'parts.name as part_name',
    'parts.code as part_code',
    'parts.model as part_model',
    'parts.unit',
    'tools.name as tool_name',
    'tools.code as tool_code',
    'tools.model as tool_model',
  )
  .where('purchase_order_items.purchase_order_id', id);
```

- [ ] **Step 4: 修改 arrival 方法**

工具项到货时不创建 inbound_records 和 stock_records：

```javascript
// In arrival, replace the item processing loop:
for (const item of arrivalItems) {
  const { item_id, arrived_quantity, location_id } = item;

  const orderItem = await trx('purchase_order_items')
    .where('id', item_id)
    .where('purchase_order_id', id)
    .first();

  if (!orderItem) continue;

  await trx('purchase_order_items')
    .where('id', item_id)
    .increment('arrived_quantity', arrived_quantity);

  // Only create inbound records and stock records for parts, not tools
  if (orderItem.item_type !== 'tool' && orderItem.part_id) {
    await trx('inbound_records').insert({
      part_id: orderItem.part_id,
      quantity: arrived_quantity,
      location_id,
      purchase_order_id: id,
      created_by,
    });

    const existing = await trx('stock_records')
      .where({ part_id: orderItem.part_id, location_id })
      .first();

    if (existing) {
      await trx('stock_records')
        .where({ part_id: orderItem.part_id, location_id })
        .increment('quantity', arrived_quantity);
    } else {
      await trx('stock_records').insert({
        part_id: orderItem.part_id,
        location_id,
        quantity: arrived_quantity,
      });
    }
  }
}
```

---

## Task 3: 前端 - PurchaseForm 增加工具选择

**Files:**
- Modify: `client/src/pages/purchases/PurchaseForm.jsx`

- [ ] **Step 1: 引入工具数据和 item_type 切换**

在 `fetchParts` 后增加 `fetchTools`：

```javascript
const [tools, setTools] = useState([]);

const fetchTools = useCallback(async () => {
  try {
    const res = await api.get('/api/tools');
    setTools(res.data || []);
  } catch {
    // silently ignore
  }
}, []);

// 在 fetchParts 的 useEffect 中增加 fetchTools
```

- [ ] **Step 2: 修改 Form.List 中的渲染**

每个明细项增加 item_type 切换（Radio.Group），根据 item_type 显示备件或工具选择器：

```jsx
<Form.Item
  {...restField}
  name={[name, 'item_type']}
  initialValue="part"
>
  <Select style={{ width: 100 }} onChange={() => {
    // Reset the part_id/tool_id when type changes
    form.setFieldValue(['items', name, 'part_id'], undefined);
    form.setFieldValue(['items', name, 'tool_id'], undefined);
  }}>
    <Select.Option value="part">备件</Select.Option>
    <Select.Option value="tool">工具</Select.Option>
  </Select>
</Form.Item>

{/* Conditional selector based on item_type */}
<Form.Item noStyle shouldUpdate={(prev, cur) => prev.items?.[name]?.item_type !== cur.items?.[name]?.item_type}>
  {({ getFieldValue }) => {
    const type = getFieldValue(['items', name, 'item_type']);
    if (type === 'tool') {
      return (
        <Form.Item {...restField} name={[name, 'tool_id']}
          rules={[{ required: true, message: '请选择工具' }]}>
          <Select showSearch style={{ width: 260 }} placeholder="选择工具"
            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            options={tools.map(t => ({
              label: `${t.code} - ${t.name} (${t.model || '-'})`,
              value: t.id,
            }))} />
        </Form.Item>
      );
    }
    return (
      <Form.Item {...restField} name={[name, 'part_id']}
        rules={[{ required: true, message: '请选择备件' }]}>
        <Select showSearch style={{ width: 260 }} placeholder="选择备件"
          filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          options={parts.map(p => ({
            label: `${p.code} - ${p.name} (${p.model || '-'})`,
            value: p.id,
          }))} />
      </Form.Item>
    );
  }}
</Form.Item>
```

- [ ] **Step 3: 更新校验逻辑**

`onFinish` 中的校验需要检查不同类型：

```javascript
for (const item of items) {
  const type = item.item_type || 'part';
  if (type === 'part' && (!item.part_id || !item.quantity)) {
    message.warning('请填写所有备件信息');
    return;
  }
  if (type === 'tool' && (!item.tool_id || !item.quantity)) {
    message.warning('请填写所有工具信息');
    return;
  }
}
```

---

## Task 4: 前端 - PurchaseDetail 显示工具信息

**Files:**
- Modify: `client/src/pages/purchases/PurchaseDetail.jsx`

- [ ] **Step 1: 修改表格列，增加"类型"列，工具项显示工具信息**

```javascript
const columns = [
  {
    title: '类型',
    dataIndex: 'item_type',
    key: 'item_type',
    width: 70,
    render: (v) => <Tag color={v === 'tool' ? 'purple' : 'blue'}>{v === 'tool' ? '工具' : '备件'}</Tag>,
  },
  {
    title: '编码',
    key: 'code',
    width: 120,
    render: (_, record) => record.item_type === 'tool' ? (record.tool_code || '-') : (record.part_code || '-'),
  },
  {
    title: '名称',
    key: 'name',
    render: (_, record) => record.item_type === 'tool' ? (record.tool_name || '-') : (record.part_name || '-'),
  },
  {
    title: '型号',
    key: 'model',
    width: 120,
    render: (_, record) => record.item_type === 'tool' ? (record.tool_model || '-') : (record.part_model || '-'),
  },
  {
    title: '单位',
    key: 'unit',
    width: 60,
    render: (_, record) => record.item_type === 'tool' ? '-' : (record.unit || '-'),
  },
  { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80 },
  { title: '已到货', dataIndex: 'arrived_quantity', key: 'arrived_quantity', width: 80 },
  {
    title: '状态',
    key: 'item_status',
    width: 100,
    render: (_, record) => {
      const qty = Number(record.quantity);
      const arrived = Number(record.arrived_quantity);
      if (arrived >= qty) return <Tag color="green">已到货</Tag>;
      if (arrived > 0) return <Tag color="orange">部分到货</Tag>;
      return <Tag color="default">未到货</Tag>;
    },
  },
];
```

---

## Task 5: 前端 - ArrivalForm 工具项不显示库位

**Files:**
- Modify: `client/src/pages/purchases/ArrivalForm.jsx`

- [ ] **Step 1: 工具项隐藏库位选择器**

在渲染每个明细项时，根据 `item.item_type` 判断：

```jsx
{(purchase.items || []).map((item, index) => {
  const remaining = (item.quantity || 0) - (item.arrived_quantity || 0);
  const isTool = item.item_type === 'tool';
  return (
    <Card key={item.id || index} size="small"
      title={
        <Space>
          {isTool ? (
            <span>{item.tool_name || item.tool_code || `工具 #${index + 1}`}</span>
          ) : (
            <span>{item.part_name || item.part_code || `备件 #${index + 1}`}</span>
          )}
          <Tag color={isTool ? 'purple' : 'blue'}>{isTool ? '工具' : '备件'}</Tag>
          {!isTool && <Tag color="blue">{item.part_model || '-'}</Tag>}
        </Space>
      }
      style={{ marginBottom: 12 }}
    >
      <Space align="baseline" style={{ flexWrap: 'wrap' }}>
        <span>订购数量: {item.quantity || 0}</span>
        <span>已到货: {item.arrived_quantity || 0}</span>
        <span>未到货: {remaining}</span>
        <Form.Item name={[index, 'item_id']} initialValue={item.id} hidden><InputNumber /></Form.Item>
        <Form.Item name={[index, 'arrived_quantity']} label="本次到货"
          initialValue={remaining > 0 ? undefined : 0}>
          <InputNumber style={{ width: 120 }} placeholder="到货数量" min={0} max={remaining} step={1} />
        </Form.Item>
        {!isTool && (
          <Form.Item name={[index, 'location_id']} label="库位">
            <Select showSearch style={{ width: 200 }} placeholder="选择库位" allowClear
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={locations.map(l => ({
                label: `${l.warehouse || ''} ${l.shelf || ''} ${l.bin || ''}`.trim(),
                value: l.id,
              }))} />
          </Form.Item>
        )}
      </Space>
    </Card>
  );
})}
```

同时在 `onFinish` 中调整校验：工具项不需要 `location_id`：

```javascript
// 替换原有的校验
for (const item of items) {
  if (!item.arrived_quantity || item.arrived_quantity <= 0) continue;
  // 找到对应的 purchase item 判断类型
  const purchaseItem = purchase.items.find(pi => pi.id === item.item_id);
  if (purchaseItem && purchaseItem.item_type !== 'tool') {
    if (!item.location_id) {
      message.warning('请为有到货数量的备件选择库位');
      return;
    }
  }
}
```

---

## Task 6: 后端 - equipmentController 增加备件库存

**Files:**
- Modify: `server/src/controllers/equipmentController.js`

- [ ] **Step 1: getById 增加库存查询**

在 `item.related_parts = parts;` 之后，增加库存汇总：

```javascript
// 查询各备件的总库存
if (parts.length > 0) {
  const partIds = parts.map(p => p.id);
  const stockCounts = await db('stock_records')
    .select('part_id')
    .sum('quantity as total_stock')
    .whereIn('part_id', partIds)
    .groupBy('part_id');

  const stockMap = {};
  for (const sc of stockCounts) {
    stockMap[sc.part_id] = Number(sc.total_stock);
  }

  item.related_parts = parts.map(p => ({
    ...p,
    stock: stockMap[p.id] || 0,
  }));
}
```

---

## Task 7: 前端 - EquipmentDetail 显示关联备件库存

**Files:**
- Modify: `client/src/pages/basicData/EquipmentDetail.jsx`

- [ ] **Step 1: 关联备件区域显示库存信息**

将"关联备件"描述项改为显示每个备件的名称、编码和库存：

```jsx
<Descriptions.Item label="关联备件">
  {relatedParts.length > 0 ? (
    <div>
      {relatedParts.map((p, i) => (
        <div key={p.id} style={{ marginBottom: 4 }}>
          <Space>
            <span>{p.name} ({p.code})</span>
            <Tag color={p.stock > 0 ? 'green' : 'red'}>
              库存: {p.stock}
            </Tag>
          </Space>
        </div>
      ))}
    </div>
  ) : '-'}
</Descriptions.Item>
```

---

## Task 8: 前端 - EquipmentList 增加关联备件数

**Files:**
- Modify: `client/src/pages/basicData/EquipmentList.jsx`

- [ ] **Step 1: 增加"关联备件"列**

在表格列定义中增加一列：

```javascript
{
  title: '关联备件',
  key: 'parts_count',
  width: 100,
  render: (_, record) => (
    <span>{record.related_parts?.length || 0} 种</span>
  ),
},
```

---

## Task 9: 前端 - WorkOrderForm 级联设备选择

**Files:**
- Modify: `client/src/pages/workOrders/WorkOrderForm.jsx`

- [ ] **Step 1: 增加系统分类数据和状态**

```javascript
const [categories, setCategories] = useState([]);
const [selectedCategory, setSelectedCategory] = useState(undefined);
```

- [ ] **Step 2: 获取系统分类**

在 `fetchOptions` 中增加：

```javascript
const [catRes, eqRes, userRes, partRes] = await Promise.all([
  api.get('/api/system-categories'),
  api.get('/api/equipment'),
  api.get('/api/auth/users'),
  api.get('/api/parts', { params: { page_size: 1000 } }),
]);
setCategories(catRes.data || []);
setEquipment(eqRes.data || []);
```

- [ ] **Step 3: 替换设备选择器为级联**

```jsx
<Form.Item label="系统分类">
  <Select
    allowClear
    placeholder="选择系统分类（可选）"
    style={{ width: '100%' }}
    value={selectedCategory}
    onChange={(value) => {
      setSelectedCategory(value);
      form.setFieldValue('equipment_id', undefined);
    }}
    options={categories.map(c => ({ label: c.name, value: c.id }))}
  />
</Form.Item>

<Form.Item
  name="equipment_id"
  label="设备"
  rules={[{ required: true, message: '请选择设备' }]}
>
  <Select
    showSearch
    placeholder="选择设备"
    filterOption={(input, option) =>
      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
    }
    options={equipment
      .filter(e => !selectedCategory || e.system_category_id === selectedCategory)
      .map(e => ({
        label: `${e.name} (${e.code || ''})`.trim(),
        value: e.id,
      }))}
  />
</Form.Item>
```

---

## Task 10: 前端 - PartForm 级联设备选择

**Files:**
- Modify: `client/src/pages/parts/PartForm.jsx`

- [ ] **Step 1: 增加系统分类数据和状态**

```javascript
const [categories, setCategories] = useState([]);
const [selectedCategory, setSelectedCategory] = useState(undefined);
```

- [ ] **Step 2: 获取系统分类**

在 `fetchOptions` 中增加：

```javascript
const [catRes, supRes, eqRes] = await Promise.all([
  api.get('/api/system-categories'),
  api.get('/api/suppliers'),
  api.get('/api/equipment'),
]);
setCategories(catRes.data || []);
setSuppliers(supRes.data || []);
setEquipment(eqRes.data || []);
```

- [ ] **Step 3: 替换关联设备选择器为级联**

在"关联供应商"和"关联设备"之间增加系统分类选择器，并将设备选择器改为过滤模式：

```jsx
<Form.Item label="系统分类">
  <Select
    allowClear
    placeholder="选择系统分类（可选）"
    value={selectedCategory}
    onChange={(value) => {
      setSelectedCategory(value);
      form.setFieldValue('equipment_ids', []);
    }}
    options={categories.map(c => ({ label: c.name, value: c.id }))}
  />
</Form.Item>

<Form.Item name="equipment_ids" label="关联设备">
  <Select
    mode="multiple"
    allowClear
    placeholder="选择设备"
    options={equipment
      .filter(e => !selectedCategory || e.system_category_id === selectedCategory)
      .map(e => ({ label: `${e.name} (${e.code})`, value: e.id }))}
  />
</Form.Item>
```

---

## 自检

1. **Spec 覆盖：**
   - 采购工具数据模型 → Task 1 (migration)
   - 采购工具后端 create/update → Task 2
   - 采购工具后端 getById (items 含工具信息) → Task 2
   - 采购工具到货（工具不生成库存） → Task 2 (arrival)
   - 采购工具前端表单 → Task 3
   - 采购工具前端详情 → Task 4
   - 采购工具到货不显示库位 → Task 5
   - 设备库存查询 → Task 6
   - 设备详情显示备件库存 → Task 7
   - 设备列表显示备件数 → Task 8
   - 工单级联选择 → Task 9
   - 备件级联选择 → Task 10

2. **占位符检查：** 无 TBD/TODO 占位符，所有代码完整。

3. **类型一致性：** item_type/tool_id 在迁移、后端、前端中一致使用。system_category_id 在 equipment 数据中已存在，前端过滤逻辑一致。
