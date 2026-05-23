import bcrypt from 'bcryptjs';

export async function seed(knex) {
  // ====================================================================
  // 1. Delete all tables in reverse dependency order
  // ====================================================================
  await knex('tool_borrows').del();
  await knex('tools').del();
  await knex('work_order_parts').del();
  await knex('outbound_records').del();
  await knex('work_orders').del();
  await knex('inbound_records').del();
  await knex('stock_records').del();
  await knex('purchase_order_items').del();
  await knex('purchase_orders').del();
  await knex('part_equipment').del();
  await knex('part_suppliers').del();
  await knex('parts').del();
  await knex('part_categories').del();
  await knex('locations').del();
  await knex('suppliers').del();
  await knex('equipment').del();
  await knex('system_categories').del();
  await knex('personnel').del();
  await knex('users').del();

  // ====================================================================
  // 2. Users
  // ====================================================================
  const hash = await bcrypt.hash('123456', 10);

  await knex('users').insert([
    { id: 1, username: 'weixiu1', password_hash: hash, name: '张三', role: 'maintenance', is_active: true },
    { id: 2, username: 'weixiu2', password_hash: hash, name: '李四', role: 'maintenance', is_active: true },
    { id: 3, username: 'cangku1', password_hash: hash, name: '王仓管', role: 'warehouse', is_active: true },
    { id: 4, username: 'caigou1', password_hash: hash, name: '赵采购', role: 'procurement', is_active: true },
  ]);

  // Personnel records
  await knex('personnel').insert([
    { id: 1, name: '张三', phone: '', position: '维修人员', status: 'active' },
    { id: 2, name: '李四', phone: '', position: '维修人员', status: 'active' },
    { id: 3, name: '王仓管', phone: '', position: '仓管人员', status: 'active' },
    { id: 4, name: '赵采购', phone: '', position: '采购人员', status: 'active' },
    { id: 5, name: '系统管理员', phone: '', position: '系统管理员', status: 'active' },
  ]);

  // Link users to personnel
  await knex('users').where({ id: 1 }).update({ personnel_id: 1 });
  await knex('users').where({ id: 2 }).update({ personnel_id: 2 });
  await knex('users').where({ id: 3 }).update({ personnel_id: 3 });
  await knex('users').where({ id: 4 }).update({ personnel_id: 4 });

  // Admin user (password: admin123)
  const adminHash = await bcrypt.hash('admin123', 10);
  await knex('users').insert({
    id: 5, username: 'admin', password_hash: adminHash, name: '系统管理员',
    role: 'admin', is_active: true, personnel_id: 5,
  });

  // ====================================================================
  // 3. System Categories
  // ====================================================================
  await knex('system_categories').insert([
    { id: 1, name: '供热系统', description: '集中供热系统相关设备' },
    { id: 2, name: '循环水系统', description: '循环水系统相关设备' },
    { id: 3, name: '换热站系统', description: '换热站系统相关设备' },
  ]);

  // ====================================================================
  // 4. Equipment
  // ====================================================================
  await knex('equipment').insert([
    { id: 1, code: 'EQ001', name: '板式换热器', model: 'BR0.2-10', location: '换热站A', system_category_id: 3 },
    { id: 2, code: 'EQ002', name: '循环水泵', model: 'ISG80-160', location: '泵房1', system_category_id: 2 },
    { id: 3, code: 'EQ003', name: '热水锅炉', model: 'WNS4-1.0-YQ', location: '锅炉房', system_category_id: 1 },
  ]);

  // ====================================================================
  // 5. Suppliers
  // ====================================================================
  await knex('suppliers').insert([
    { id: 1, name: '北方阀门有限公司', contact_person: '刘经理', phone: '010-88886666', supply_category: '阀门类' },
    { id: 2, name: '东方泵业集团', contact_person: '陈工', phone: '021-66668888', supply_category: '泵类' },
    { id: 3, name: '华丰密封件厂', contact_person: '黄厂长', phone: '0311-55557777', supply_category: '密封件' },
  ]);

  // ====================================================================
  // 6. Part Categories
  // ====================================================================
  await knex('part_categories').insert([
    // Top-level categories
    { id: 1, name: '阀门类', parent_id: null },
    { id: 2, name: '泵配件', parent_id: null },
    { id: 3, name: '管件类', parent_id: null },
    { id: 4, name: '仪表类', parent_id: null },
    // Sub-categories under 阀门类 (id: 1)
    { id: 5, name: '截止阀', parent_id: 1 },
    { id: 6, name: '球阀', parent_id: 1 },
    { id: 7, name: '安全阀', parent_id: 1 },
    // Sub-categories under 泵配件 (id: 2)
    { id: 8, name: '泵轴', parent_id: 2 },
    { id: 9, name: '叶轮', parent_id: 2 },
    { id: 10, name: '机械密封', parent_id: 2 },
    // Sub-categories under 管件类 (id: 3)
    { id: 11, name: '法兰', parent_id: 3 },
    { id: 12, name: '弯头', parent_id: 3 },
    { id: 13, name: '三通', parent_id: 3 },
    // Sub-categories under 仪表类 (id: 4)
    { id: 14, name: '温度计', parent_id: 4 },
    { id: 15, name: '压力表', parent_id: 4 },
  ]);

  // ====================================================================
  // 7. Parts (at least 10)
  // ====================================================================
  await knex('parts').insert([
    // 阀门类 - 截止阀
    { id: 1, code: 'F-VALVE-001', name: '截止阀', model: 'J41H-16C', specification: 'DN50', unit: '个', category_id: 5, min_stock: 10, max_stock: 50 },
    // 阀门类 - 球阀
    { id: 2, code: 'F-VALVE-002', name: '球阀', model: 'Q41F-16C', specification: 'DN80', unit: '个', category_id: 6, min_stock: 5, max_stock: 30 },
    // 阀门类 - 安全阀
    { id: 3, code: 'F-VALVE-003', name: '安全阀', model: 'A48Y-16C', specification: 'DN100', unit: '个', category_id: 7, min_stock: 5, max_stock: 20 },
    // 管件类 - 法兰
    { id: 4, code: 'F-FLANGE-001', name: '平焊法兰', model: 'PL50-1.6', specification: 'DN50 PN16', unit: '片', category_id: 11, min_stock: 20, max_stock: 100 },
    // 管件类 - 弯头
    { id: 5, code: 'F-ELBOW-001', name: '90度弯头', model: 'DN80-4.5', specification: 'DN80', unit: '个', category_id: 12, min_stock: 10, max_stock: 60 },
    // 泵配件 - 机械密封
    { id: 6, code: 'F-MECH-001', name: '机械密封', model: 'MG1-25', specification: '25mm', unit: '套', category_id: 10, min_stock: 10, max_stock: 40 },
    // 泵配件 - 叶轮
    { id: 7, code: 'F-IMPELLER-001', name: '叶轮', model: 'ISG80-160-01', specification: 'ISG80', unit: '个', category_id: 9, min_stock: 5, max_stock: 20 },
    // 泵配件 - 泵轴
    { id: 8, code: 'F-SHAFT-001', name: '泵轴', model: 'ISG80-160-02', specification: 'ISG80/45#钢', unit: '根', category_id: 8, min_stock: 5, max_stock: 15 },
    // 仪表类 - 压力表
    { id: 9, code: 'F-GAUGE-001', name: '弹簧管压力表', model: 'Y-100', specification: '0-1.6MPa', unit: '块', category_id: 15, min_stock: 10, max_stock: 30 },
    // 仪表类 - 温度计
    { id: 10, code: 'F-THERMO-001', name: '双金属温度计', model: 'WSS-481', specification: '0-200°C L=100', unit: '支', category_id: 14, min_stock: 5, max_stock: 20 },
    // 管件类 - 三通
    { id: 11, code: 'F-TEE-001', name: '等径三通', model: 'DN65-4.0', specification: 'DN65', unit: '个', category_id: 13, min_stock: 5, max_stock: 30 },
    // 阀门类 - 截止阀另一种规格
    { id: 12, code: 'F-VALVE-004', name: '截止阀', model: 'J41H-25', specification: 'DN65', unit: '个', category_id: 5, min_stock: 5, max_stock: 30 },
  ]);

  // ====================================================================
  // Part-Supplier relationships
  // ====================================================================
  await knex('part_suppliers').insert([
    { part_id: 1, supplier_id: 1 },
    { part_id: 2, supplier_id: 1 },
    { part_id: 3, supplier_id: 1 },
    { part_id: 4, supplier_id: 3 },
    { part_id: 5, supplier_id: 3 },
    { part_id: 6, supplier_id: 3 },
    { part_id: 6, supplier_id: 2 },
    { part_id: 7, supplier_id: 2 },
    { part_id: 8, supplier_id: 2 },
    { part_id: 9, supplier_id: 3 },
    { part_id: 10, supplier_id: 3 },
  ]);

  // ====================================================================
  // Part-Equipment relationships
  // ====================================================================
  await knex('part_equipment').insert([
    { part_id: 1, equipment_id: 1 },
    { part_id: 2, equipment_id: 1 },
    { part_id: 3, equipment_id: 3 },
    { part_id: 4, equipment_id: 1 },
    { part_id: 5, equipment_id: 1 },
    { part_id: 6, equipment_id: 2 },
    { part_id: 7, equipment_id: 2 },
    { part_id: 8, equipment_id: 2 },
    { part_id: 9, equipment_id: 2 },
    { part_id: 9, equipment_id: 3 },
    { part_id: 10, equipment_id: 3 },
    { part_id: 11, equipment_id: 1 },
    { part_id: 12, equipment_id: 1 },
  ]);

  // ====================================================================
  // 8. Locations
  // ====================================================================
  await knex('locations').insert([
    // 主仓库/货架A
    { id: 1, warehouse: '主仓库', shelf: '货架A', bin: '位A01', type: 'normal' },
    { id: 2, warehouse: '主仓库', shelf: '货架A', bin: '位A02', type: 'normal' },
    { id: 3, warehouse: '主仓库', shelf: '货架A', bin: '位A03', type: 'normal' },
    { id: 4, warehouse: '主仓库', shelf: '货架A', bin: '位A04', type: 'normal' },
    { id: 5, warehouse: '主仓库', shelf: '货架A', bin: '位A05', type: 'normal' },
    // 主仓库/货架B
    { id: 6, warehouse: '主仓库', shelf: '货架B', bin: '位B01', type: 'normal' },
    { id: 7, warehouse: '主仓库', shelf: '货架B', bin: '位B02', type: 'normal' },
    { id: 8, warehouse: '主仓库', shelf: '货架B', bin: '位B03', type: 'normal' },
    // 恒温库/货架C
    { id: 9, warehouse: '恒温库', shelf: '货架C', bin: '位C01', type: 'temperature_controlled' },
    { id: 10, warehouse: '恒温库', shelf: '货架C', bin: '位C02', type: 'temperature_controlled' },
    { id: 11, warehouse: '恒温库', shelf: '货架C', bin: '位C03', type: 'temperature_controlled' },
    // 露天堆场
    { id: 12, warehouse: '露天堆场', shelf: '-', bin: '露天区', type: 'outdoor' },
  ]);

  // ====================================================================
  // 9. Stock Records
  // ====================================================================
  await knex('stock_records').insert([
    { part_id: 1, location_id: 1, quantity: 25 },
    { part_id: 2, location_id: 2, quantity: 15 },
    { part_id: 3, location_id: 3, quantity: 8 },
    { part_id: 4, location_id: 4, quantity: 50 },
    { part_id: 5, location_id: 5, quantity: 30 },
    { part_id: 6, location_id: 9, quantity: 18 },
    { part_id: 7, location_id: 9, quantity: 10 },
    { part_id: 8, location_id: 6, quantity: 6 },
    { part_id: 9, location_id: 7, quantity: 12 },
    { part_id: 10, location_id: 8, quantity: 8 },
    { part_id: 11, location_id: 12, quantity: 20 },
    { part_id: 12, location_id: 1, quantity: 12 },
  ]);

  // ====================================================================
  // 10. Purchase Orders (2+)
  // ====================================================================
  await knex('purchase_orders').insert([
    { id: 1, order_no: 'PO-2025-001', status: 'ordered', priority: 'normal', created_by: 4, remark: '第一季度阀门备件采购' },
    { id: 2, order_no: 'PO-2025-002', status: 'pending', priority: 'urgent', created_by: 4, remark: '循环水泵维修紧急采购' },
  ]);

  // Purchase Order Items
  await knex('purchase_order_items').insert([
    { id: 1, purchase_order_id: 1, part_id: 1, quantity: 20, arrived_quantity: 0 },
    { id: 2, purchase_order_id: 1, part_id: 2, quantity: 10, arrived_quantity: 0 },
    { id: 3, purchase_order_id: 1, part_id: 3, quantity: 5, arrived_quantity: 0 },
    { id: 4, purchase_order_id: 2, part_id: 6, quantity: 5, arrived_quantity: 0 },
    { id: 5, purchase_order_id: 2, part_id: 7, quantity: 3, arrived_quantity: 0 },
  ]);

  // ====================================================================
  // 11. Work Orders (1+ pending)
  // ====================================================================
  await knex('work_orders').insert([
    {
      id: 1,
      order_no: 'WO-2025-001',
      equipment_id: 2,
      fault_description: '循环水泵异响，疑似轴承磨损，需要更换机械密封',
      assignee_id: 1,
      status: 'pending',
    },
    {
      id: 2,
      order_no: 'WO-2025-002',
      equipment_id: 1,
      fault_description: '板式换热器密封垫老化漏水，需更换密封垫并清洗板片',
      assignee_id: 2,
      status: 'in_progress',
    },
  ]);

  // Work Order Parts
  await knex('work_order_parts').insert([
    { work_order_id: 1, part_id: 6, quantity: 2 },
    { work_order_id: 2, part_id: 4, quantity: 4 },
    { work_order_id: 2, part_id: 5, quantity: 2 },
  ]);

  // ====================================================================
  // 12. Tools (3+)
  // ====================================================================
  await knex('tools').insert([
    { id: 1, code: 'T-DMM-001', name: '万用表', model: 'FLUKE-17B+', category: '仪表', status: 'available', location: '工具柜A' },
    { id: 2, code: 'T-WRENCH-001', name: '扳手套装', model: '世达09014', category: '手动工具', status: 'available', location: '工具柜A' },
    { id: 3, code: 'T-SCREWDRIVER-001', name: '电动螺丝刀', model: '博世GO2', category: '电动工具', status: 'available', location: '工具柜B' },
    { id: 4, code: 'T-METER-001', name: '钳形电流表', model: 'FLUKE-319', category: '仪表', status: 'available', location: '工具柜A' },
  ]);

  // ====================================================================
  // 13. Tool Borrows (1 active)
  // ====================================================================
  await knex('tool_borrows').insert([
    {
      id: 1,
      tool_id: 2,
      borrower_user_id: 1,
      borrowed_at: knex.fn.now(),
      expected_return_at: knex.raw("NOW() + INTERVAL '3 days'"),
      purpose: '维修循环水泵，需使用扳手拆装螺栓',
    },
  ]);

  // ====================================================================
  // 14. Inbound Records (to show transaction history)
  // ====================================================================
  await knex('inbound_records').insert([
    { part_id: 1, quantity: 30, location_id: 1, supplier_id: 1, created_by: 3, remark: '期初入库' },
    { part_id: 4, quantity: 60, location_id: 4, supplier_id: 3, created_by: 3, remark: '期初入库' },
    { part_id: 6, quantity: 20, location_id: 9, supplier_id: 2, created_by: 3, remark: '期初入库' },
  ]);

  // ====================================================================
  // 15. Outbound Records
  // ====================================================================
  await knex('outbound_records').insert([
    { part_id: 6, quantity: 2, location_id: 9, recipient: '张三', work_order_id: 1, created_by: 3, remark: 'WO-2025-001 维修领用' },
  ]);

  // ====================================================================
  // 16. Reset sequences — seed uses explicit IDs, so auto-increment
  //     sequences are not advanced. Without this, new INSERTs conflict.
  // ====================================================================
  await knex.raw("SELECT setval('personnel_id_seq', (SELECT COALESCE(MAX(id),1) FROM personnel))");
  await knex.raw("SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id),1) FROM users))");
  await knex.raw("SELECT setval('system_categories_id_seq', (SELECT COALESCE(MAX(id),1) FROM system_categories))");
  await knex.raw("SELECT setval('equipment_id_seq', (SELECT COALESCE(MAX(id),1) FROM equipment))");
  await knex.raw("SELECT setval('suppliers_id_seq', (SELECT COALESCE(MAX(id),1) FROM suppliers))");
  await knex.raw("SELECT setval('part_categories_id_seq', (SELECT COALESCE(MAX(id),1) FROM part_categories))");
  await knex.raw("SELECT setval('parts_id_seq', (SELECT COALESCE(MAX(id),1) FROM parts))");
  await knex.raw("SELECT setval('part_suppliers_id_seq', (SELECT COALESCE(MAX(id),1) FROM part_suppliers))");
  await knex.raw("SELECT setval('part_equipment_id_seq', (SELECT COALESCE(MAX(id),1) FROM part_equipment))");
  await knex.raw("SELECT setval('locations_id_seq', (SELECT COALESCE(MAX(id),1) FROM locations))");
  await knex.raw("SELECT setval('stock_records_id_seq', (SELECT COALESCE(MAX(id),1) FROM stock_records))");
  await knex.raw("SELECT setval('inbound_records_id_seq', (SELECT COALESCE(MAX(id),1) FROM inbound_records))");
  await knex.raw("SELECT setval('outbound_records_id_seq', (SELECT COALESCE(MAX(id),1) FROM outbound_records))");
  await knex.raw("SELECT setval('purchase_orders_id_seq', (SELECT COALESCE(MAX(id),1) FROM purchase_orders))");
  await knex.raw("SELECT setval('purchase_order_items_id_seq', (SELECT COALESCE(MAX(id),1) FROM purchase_order_items))");
  await knex.raw("SELECT setval('work_orders_id_seq', (SELECT COALESCE(MAX(id),1) FROM work_orders))");
  await knex.raw("SELECT setval('work_order_parts_id_seq', (SELECT COALESCE(MAX(id),1) FROM work_order_parts))");
  await knex.raw("SELECT setval('tools_id_seq', (SELECT COALESCE(MAX(id),1) FROM tools))");
  await knex.raw("SELECT setval('tool_borrows_id_seq', (SELECT COALESCE(MAX(id),1) FROM tool_borrows))");
}
