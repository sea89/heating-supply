# 库位管理增强 & 导入导出设计

## 概述

对供热公司备件采购维修 App 的库位管理进行增强，新增：
1. 库位树显示备件/工具数量
2. Excel 导入导出功能（拆分为两个独立模板）
3. 设备详情页面（维修记录 + 更换备件）

## 1. 库位树显示备件/工具数量

### 后端（locationsController.js）

修改 `tree` 接口，在每个 bin 节点增加 `part_count` 和 `tool_count`：

- `part_count`：从 `stock_records` 表按 `location_id` 分组统计，返回 distinct part_id 数量
- `tool_count`：从 `tools` 表按 `location` 字段匹配统计（工具 location 为自由文本，按名称匹配）

### 前端（LocationManage.jsx）

修改 `renderBinTitle`，在库位名称后追加 `（备件 N | 工具 M）`。

## 2. Excel 导入导出

### 技术选型
- 后端使用 `exceljs` 读写 Excel
- 后端使用 `multer` 处理文件上传
- 导入全部在事务中执行，出错回滚

### 两个独立的导入模板

**设备导入模板.xlsx**（4 个工作表）：

| 工作表 | 字段 | 说明 |
|--------|------|------|
| 系统分类 | name, parent_name | 设备的系统分类层级 |
| 设备 | code, name, model, location, system_category | 设备台账，system_category 按名称匹配 |
| 设备备件 | equipment_code, part_code | 设备与备件的多对多关联 |
| 供应商 | name, contact, phone, address | 供应商名录 |

**备件导入模板.xlsx**（6 个工作表）：

| 工作表 | 字段 | 说明 |
|--------|------|------|
| 备件分类 | name, parent_name | 备件的分类树 |
| 备件 | code, name, model, spec, unit, category, min_stock, max_stock | 分类按名称匹配 |
| 备件供应商 | part_code, supplier_name | 备件与供应商关联 |
| 库位 | warehouse, shelf, bin, type | 仓库-货架-库位层级 |
| 库存 | part_code, warehouse, shelf, bin, quantity | 按库位路径匹配 location_id |
| 工具 | code, name, model, category, location | 工具清单（location 为自由文本） |

### 导入流程

按工作表顺序处理，每个工作表内的行也按顺序处理以支持依赖：
1. 系统分类（先 parent 后 child）
2. 设备
3. 设备备件
4. 供应商
5. 备件分类
6. 备件
7. 备件供应商
8. 库位
9. 库存
10. 工具

全部在一个数据库事务中执行。

### 导出

- `GET /api/export/download` — 下载完整的 Excel 文件（包含所有工作表）
- 也可按模板分别下载：`?type=equipment` 或 `?type=parts`

### API 设计

```
POST /api/import/upload         — 上传 Excel 导入（multipart/form-data，文件字段名 file）
GET  /api/export/template      — 下载导入模板（可指定 ?type=equipment|parts）
GET  /api/export/download      — 下载全部数据
GET  /api/equipment/:id        — 详情接口增强（增加工单记录）
```

### 前端改动

#### LocationManage.jsx
- 标题栏增加三个按钮：导入、导出、下载模板
- 导入弹出 Upload 组件，上传后自动导入并刷新树
- 导出直接下载文件
- 下载模板直接下载模板文件

#### EquipmentList.jsx
- 标题栏增加同样三个按钮
- 设备名称改为 `<a>` 链接，点击跳转到设备详情页

## 3. 设备详情页（维修记录 + 更换备件）

### 新增 EquipmentDetail.jsx

页面布局：

```
┌──────────────────────────────────────┐
│  设备详情（返回列表）                  │
├──────────────────────────────────────┤
│  基本信息                            │
│  编号: E001  名称: 锅炉A             │
│  型号: BW-2000  位置: 1号机房         │
│  系统分类: 供热设备                    │
│  关联备件: 轴承(1003), 密封圈(1005)  │
├──────────────────────────────────────┤
│  维修记录（工单）                     │
│  ┌──────┬──────┬──────┬──────┬────┐ │
│  │工单号│故障描述│负责人│状态  │日期│ │
│  ├──────┼──────┼──────┼──────┼────┤ │
│  │WO... │...   │...   │...   │... │ │
│  │  ┌────────┬──────┬────┬────┐  │ │
│  │  │更换备件│编码   │数量│单位│  │ │
│  │  │轴承    │1003  │2   │个  │  │ │
│  │  └────────┴──────┴────┴────┘  │ │
│  └──────┴──────┴──────┴──────┴────┘ │
└──────────────────────────────────────┘
```

### 后端增强

修改 `equipmentController.getById`：
- 保留现有逻辑（设备信息 + 关联备件）
- 增加查询：以该设备 `id` 查 `work_orders` 表，获取关联的工单列表
- 每个工单附带其 `work_order_parts` 明细（通过额外查询或 JOIN）

### 路由

```
/equipment/:id  → EquipmentDetail.jsx
```

### 前端路由

在路由配置中增加 `/equipment/:id` 指向 `EquipmentDetail`。

## 数据流

### 导入数据流
```
用户上传 Excel → multer 接收 → 解析所有工作表 →
按依赖顺序逐行处理 → 同一事务写入数据库 → 返回结果
```

### 导出数据流
```
用户点击导出 → 后端查询所有相关表 →
构建 Excel 工作簿 → 返回文件下载
```

### 树数据流
```
用户打开库位管理 → GET /api/locations/tree →
后端查询 locations + stock_records 汇总 + tools 汇总 →
返回树结构含 part_count / tool_count → 前端渲染
```

## 依赖项

### 后端新增
- `exceljs` — Excel 读写
- `multer` — 文件上传

### 客户端新增
- 无新增依赖（使用现有 axios 下载文件，antd Upload 上传）
