# Workflow Linkage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Link work orders, purchases, and inventory (inbound/outbound) into a seamless workflow with auto-fill between forms.

**Architecture:** Frontend-only changes. All forms accept URL query params to pre-fill from source context (work order or purchase order). Existing backend APIs (`GET /api/work-orders/:id`, `GET /api/purchases/:id`) already return all needed data.

**Tech Stack:** React (react-router-dom v6), Ant Design, Axios

---

### Task 1: WorkOrderDetail — Add quick-action buttons

**Files:**
- Modify: `client/src/pages/workOrders/WorkOrderDetail.jsx`

- [ ] **Step 1: Add navigation buttons to the header extra**

Add two buttons in the Card `extra` section alongside the existing "完结工单" button:

```jsx
extra={
  <Space>
    {!isComplete && (
      <Button
        type="primary"
        icon={<CheckCircleOutlined />}
        onClick={() => navigate(`/work-orders/${id}/complete`)}
      >
        完结工单
      </Button>
    )}
    <Button icon={<ShoppingCartOutlined />} onClick={() => navigate(`/purchases/new?work_order_id=${id}`)}>
      创建采购单
    </Button>
    <Button icon={<ExportOutlined />} onClick={() => navigate(`/inventory/outbound?work_order_id=${id}`)}>
      出库登记
    </Button>
  </Space>
}
```

- [ ] **Step 2: Add the new icon imports**

Replace existing icon imports:
```jsx
import { ArrowLeftOutlined, CheckCircleOutlined, ShoppingCartOutlined, ExportOutlined } from '@ant-design/icons';
```

Also remove `Space` from the existing import if it's already imported. Check the current import: `import { Card, Descriptions, Table, Tag, Button, Space, message, Spin } from 'antd';` — `Space` and `Button` are already imported. Good.

- [ ] **Step 3: Verify the file compiles**

Run: `cd client && npx eslint src/pages/workOrders/WorkOrderDetail.jsx` (or just do a syntax check)

---

### Task 2: PurchaseForm — Support work_order_id query param

**Files:**
- Modify: `client/src/pages/purchases/PurchaseForm.jsx`

- [ ] **Step 1: Add useSearchParams import and read query param**

```jsx
import { useNavigate, useSearchParams } from 'react-router-dom';
```

Add inside the component, after `const navigate = useNavigate();`:
```jsx
const [searchParams] = useSearchParams();
const workOrderId = searchParams.get('work_order_id');
```

- [ ] **Step 2: Fetch work order data if workOrderId is present**

Add a new fetch function:
```jsx
const fetchWorkOrderParts = useCallback(async () => {
  if (!workOrderId) return;
  try {
    const res = await api.get(`/api/work-orders/${workOrderId}`);
    const wo = res.data;
    if (wo.parts && wo.parts.length > 0) {
      form.setFieldsValue({
        work_order_id: wo.id,
        items: wo.parts.map(p => ({
          part_id: p.part_id,
          quantity: Number(p.quantity),
        })),
      });
    } else {
      form.setFieldsValue({ work_order_id: wo.id });
    }
  } catch {
    // silently ignore
  }
}, [workOrderId, form]);
```

Call it in useEffect:
```jsx
useEffect(() => {
  if (workOrderId) {
    // Wait for parts list to load before pre-filling
    if (parts.length > 0) {
      fetchWorkOrderParts();
    }
  }
}, [workOrderId, parts.length, fetchWorkOrderParts]);
```

Wait, the issue is that `fetchWorkOrderParts` uses `form.setFieldsValue` but the form fields (Select options for parts) need to be loaded first. Let me rethink.

Actually, a better approach: fetch the work order parts as soon as the component mounts (after parts list is ready), then set the form values. The Select options are already loaded from the parts API.

Let me revise:

```jsx
// After existing useEffect that fetches parts, work orders, etc.
useEffect(() => {
  if (workOrderId && parts.length > 0) {
    loadWorkOrderParts();
  }
}, [workOrderId, parts.length]);

const loadWorkOrderParts = async () => {
  try {
    const res = await api.get(`/api/work-orders/${workOrderId}`);
    const wo = res.data;
    const formValues = { work_order_id: wo.id };
    if (wo.parts && wo.parts.length > 0) {
      formValues.items = wo.parts.map(p => ({
        part_id: p.part_id,
        quantity: Number(p.quantity),
      }));
    }
    form.setFieldsValue(formValues);
  } catch {
    // silently
  }
};
```

- [ ] **Step 3: Add the `useSearchParams` import**

Update import line:
```jsx
import { useNavigate, useSearchParams } from 'react-router-dom';
```

---

### Task 3: OutboundForm — Support work_order_id query param

**Files:**
- Modify: `client/src/pages/inventory/OutboundForm.jsx`

- [ ] **Step 1: Add useSearchParams import**

```jsx
import { useNavigate, useSearchParams } from 'react-router-dom';
```

Wait, the current file doesn't import `useNavigate`. Let me check again... No, it doesn't have routing navigation at all. I need to add it.

Current imports:
```jsx
import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Form, Input, InputNumber, Select, Space, message } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import api from '../../api/client';
```

- [ ] **Step 2: Add useNavigate and useSearchParams**

```jsx
import { useNavigate, useSearchParams } from 'react-router-dom';
```

Add inside component:
```jsx
const navigate = useNavigate();
const [searchParams] = useSearchParams();
const workOrderId = searchParams.get('work_order_id');
```

- [ ] **Step 3: Load work order data if workOrderId is present**

```jsx
const [presetWorkOrder, setPresetWorkOrder] = useState(null);

useEffect(() => {
  if (workOrderId && parts.length > 0 && locations.length > 0) {
    loadWorkOrderParts();
  }
}, [workOrderId, parts.length, locations.length]);

const loadWorkOrderParts = async () => {
  try {
    const res = await api.get(`/api/work-orders/${workOrderId}`);
    const wo = res.data;
    setPresetWorkOrder(wo);
    const formValues = {};
    if (wo.parts && wo.parts.length > 0) {
      formValues.items = wo.parts.map(p => ({
        part_id: p.part_id,
        quantity: Number(p.quantity),
        work_order_id: wo.id,
      }));
    } else {
      // Still set work_order_id even if no parts
      formValues.items = [{ work_order_id: wo.id }];
    }
    form.setFieldsValue(formValues);
  } catch {
    // silently
  }
};
```

Wait, there's an issue. The work_order_id in the OutboundForm is per-item (each item row has its own work_order_id select). When pre-filling from work order, I should set the work_order_id for all items, and also hide or disable the per-item work order selector.

Actually, let me think about this differently. The current form has `work_order_id` as a per-item field (each item in Form.List has its own work_order_id select). When pre-filling from a work order, I should:

1. Pre-fill all items with that work_order_id
2. For better UX, maybe show the work order info at the top of the form (read-only)
3. Hide the per-item work_order_id select since it's already set

But this adds complexity. A simpler approach: just pre-fill the work_order_id on each item row, and if the user wants to change it per-item they can. Actually wait, that doesn't make sense either — you wouldn't have different work orders for different items in the same outbound batch.

Let me simplify: Keep the per-item work_order_id field as-is, but pre-fill it for all items when workOrderId is provided. Adding a work order info display would be nice but might be scope creep.

Actually, I just realized the outbound form submits an array of items, each with its own work_order_id. The API handles it per-item already. So pre-filling each item's work_order_id is correct.

Let me also handle navigation after submit - redirect back to the work order detail if workOrderId was provided.

- [ ] **Step 4: Update handleSubmit to navigate back**

After `message.success('出库成功')`, navigate:
```jsx
if (workOrderId) {
  navigate(`/work-orders/${workOrderId}`);
} else {
  form.resetFields();
  fetchStock();
}
```

Wait, but `workOrderId` is the query param. If the user pre-filled from a work order, they probably want to go back to that work order. If they came to the form directly (no workOrderId), stay on the same page (reset form).

---

### Task 4: InboundForm — Support purchase_order_id query param

**Files:**
- Modify: `client/src/pages/inventory/InboundForm.jsx`

- [ ] **Step 1: Add imports and params**

```jsx
import { useNavigate, useSearchParams } from 'react-router-dom';
```

Inside component:
```jsx
const navigate = useNavigate();
const [searchParams] = useSearchParams();
const purchaseOrderId = searchParams.get('purchase_order_id');
const [purchaseOrders, setPurchaseOrders] = useState([]);
```

- [ ] **Step 2: Fetch purchase orders list**

```jsx
const fetchPurchaseOrders = useCallback(async () => {
  try {
    const res = await api.get('/api/purchases');
    setPurchaseOrders(res.data || []);
  } catch {
    // silently
  }
}, []);

useEffect(() => {
  fetchPurchaseOrders();
}, [fetchPurchaseOrders]);
```

- [ ] **Step 3: Add purchase order selector and auto-fill logic**

Add a purchase order selector at the top of the form, before the Form.List:

```jsx
{purchaseOrders.length > 0 && (
  <Form.Item label="关联采购单">
    <Select
      showSearch
      style={{ maxWidth: 400 }}
      placeholder="选择采购单自动填充（可选）"
      allowClear
      value={selectedPurchaseOrderId}
      onChange={handlePurchaseOrderChange}
      filterOption={(input, option) =>
        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
      }
      options={purchaseOrders.map(po => ({
        label: `${po.order_no} - ${po.status || ''}`,
        value: po.id,
      }))}
    />
  </Form.Item>
)}
```

- [ ] **Step 4: Implement the change handler**

```jsx
const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState(null);

const handlePurchaseOrderChange = async (value) => {
  setSelectedPurchaseOrderId(value);
  if (!value) return;
  try {
    const res = await api.get(`/api/purchases/${value}`);
    const po = res.data;
    if (po.items && po.items.length > 0) {
      const remainingItems = po.items
        .filter(item => Number(item.arrived_quantity || 0) < Number(item.quantity))
        .map(item => ({
          part_id: item.part_id,
          quantity: Number(item.quantity) - Number(item.arrived_quantity || 0),
          purchase_order_id: po.id,
        }));
      form.setFieldsValue({ items: remainingItems });
    }
  } catch {
    message.error('获取采购单明细失败');
  }
};
```

- [ ] **Step 5: Support query param pre-fill**

```jsx
useEffect(() => {
  if (purchaseOrderId) {
    // Need to wait for parts/locations to load first
    if (parts.length > 0 && locations.length > 0) {
      handlePurchaseOrderChange(Number(purchaseOrderId));
      setSelectedPurchaseOrderId(Number(purchaseOrderId));
    }
  }
}, [purchaseOrderId, parts.length, locations.length]);
```

- [ ] **Step 6: Update handleSubmit to navigate back**

After successful submit:
```jsx
if (selectedPurchaseOrderId) {
  navigate(`/purchases/${selectedPurchaseOrderId}`);
} else {
  form.resetFields();
  // reload data
  fetchParts();
  fetchLocations();
}
```

---

### Task 5: Rebuild and verify

- [ ] **Step 1: Rebuild Docker containers**

```bash
cd /sessions/ecstatic-youthful-lovelace/mnt/heating-supply-app
docker-compose down
docker-compose up -d --build
```

- [ ] **Step 2: Verify the flows**

1. Open work order detail → verify both "创建采购单" and "出库登记" buttons appear
2. Click "创建采购单" → verify URL has work_order_id param, form pre-filled with parts and quantities
3. Go to work order detail → click "出库登记" → verify form pre-filled with parts
4. Go to inbound form → verify purchase order selector exists and pre-fills items
5. Verify existing standalone flows still work (no regressions)
