# 工单·采购·出入库 全流程关联设计

## 概述

将工单、采购、出入库三个模块打通形成闭环：从工单发起，可快捷创建采购单和出库登记；入库时可关联采购单自动填充；各模块之间数据自动联动。

## 当前关联状态

- 采购单 ↔ 工单：已关联（work_order_id, 前端已展示互链）
- 入库 ↔ 采购单：已关联（purchase_order_id 写入库记录）
- 出库 ↔ 工单：已关联（work_order_id 写出库记录）
- 工单 ↔ 备件：已关联（work_order_parts）

## 新增改动

### A. 工单详情页 → 快捷操作按钮

在工单详情页顶部操作栏增加两个按钮：
- **创建采购单**：`/purchases/new?work_order_id=${id}`
- **出库登记**：`/inventory/outbound?work_order_id=${id}`

所有状态（含已完工）均显示这两个按钮。

### B. 采购单表单 → 从工单预填

- 读取 URL 查询参数 `work_order_id`
- 调用 `GET /api/work-orders/{id}` 获取工单数据（含 parts）
- 自动选中关联工单下拉框
- 从 `work_order_parts` 预填采购明细：备件 + 数量
- 数量初始等于工单需求量，用户可修改、添加、删除

### C. 出库表单 → 从工单预填

- 读取 URL 查询参数 `work_order_id`
- 调用 `GET /api/work-orders/{id}` 获取工单数据
- 自动填入关联工单号
- 预填备件明细（备件 + 数量可修改）
- 新增 `work_order_id` 隐藏字段，出库时写入 outbound_records
- 提交成功后跳转回工单详情页

### D. 入库表单 → 从采购单预填

- 新增「关联采购单」可选下拉框
- 选择采购单后调用 `GET /api/purchases/{id}` 获取采购明细（含 items）
- 计算各采购项的剩余未到货数量 = quantity - arrived_quantity
- 自动填入入库明细：备件 + 剩余数量（可修改）
- 自动关联 `purchase_order_id` 到入库记录
- 用户仍可额外手动添加其他入库项

## 不变的部分

- 所有后端 API 无需新增或修改（现有接口已返回足够数据）
- 现有的独立入口（采购单页面手动创建、出库/入库页面手动添加）保持可用
- 到货登记从采购单详情页的入口保持不变

## 路由设计

```
/purchases/new              → 普通新建（无预填）
/purchases/new?work_order_id=xxx  → 从工单预填
/inventory/outbound              → 普通出库（无预填）
/inventory/outbound?work_order_id=xxx  → 从工单预填
/inventory/inbound               → 普通入库（无预填）
/inventory/inbound?purchase_order_id=xxx  → 从采购单预填
```
