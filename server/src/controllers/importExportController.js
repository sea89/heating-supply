import ExcelJS from 'exceljs';
import db from '../config/database.js';

// ──────────────────────────────────────────────
// Helper: safe knex insert returning id for knex 3.1.0
// ──────────────────────────────────────────────
async function insertAndGetId(trx, table, data) {
  const result = await trx(table).insert(data).returning('id');
  return result?.[0]?.id ?? result?.id ?? result;
}

// ──────────────────────────────────────────────
// 1. DOWNLOAD TEMPLATE
// ──────────────────────────────────────────────
export const downloadTemplate = async (req, res, next) => {
  try {
    const type = req.query.type; // 'equipment' | 'parts' | undefined
    const wb = new ExcelJS.Workbook();

    if (!type || type === 'equipment') {
      addEquipmentTemplateSheets(wb);
    }

    if (!type || type === 'parts') {
      addPartsTemplateSheets(wb);
    }

    const filename = getTemplateFilename(type);
    const encodedName = encodeURIComponent(filename);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedName}`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
};

function getTemplateFilename(type) {
  if (type === 'equipment') return '设备导入模板.xlsx';
  if (type === 'parts') return '备件导入模板.xlsx';
  return '导入模板.xlsx';
}

function addEquipmentTemplateSheets(wb) {
  // Sheet 1: 系统分类
  const ws1 = wb.addWorksheet('系统分类');
  ws1.columns = [
    { header: 'name', key: 'name', width: 20 },
    { header: 'parent_name', key: 'parent_name', width: 20 },
  ];
  ws1.getRow(1).font = { bold: true };
  ws1.addRow({ name: '锅炉', parent_name: '' });
  ws1.addRow({ name: '水泵', parent_name: '锅炉' });

  // Sheet 2: 设备
  const ws2 = wb.addWorksheet('设备');
  ws2.columns = [
    { header: 'code', key: 'code', width: 15 },
    { header: 'name', key: 'name', width: 20 },
    { header: 'model', key: 'model', width: 15 },
    { header: 'location', key: 'location', width: 15 },
    { header: 'system_category', key: 'system_category', width: 15 },
  ];
  ws2.getRow(1).font = { bold: true };
  ws2.addRow({ code: 'E001', name: '锅炉A', model: 'BW-2000', location: '1号机房', system_category: '锅炉' });

  // Sheet 3: 设备备件
  const ws3 = wb.addWorksheet('设备备件');
  ws3.columns = [
    { header: 'equipment_code', key: 'equipment_code', width: 15 },
    { header: 'part_code', key: 'part_code', width: 15 },
  ];
  ws3.getRow(1).font = { bold: true };
  ws3.addRow({ equipment_code: 'E001', part_code: '1001' });

  // Sheet 4: 供应商
  const ws4 = wb.addWorksheet('供应商');
  ws4.columns = [
    { header: 'name', key: 'name', width: 20 },
    { header: 'contact_person', key: 'contact_person', width: 15 },
    { header: 'phone', key: 'phone', width: 18 },
    { header: 'address', key: 'address', width: 30 },
  ];
  ws4.getRow(1).font = { bold: true };
  ws4.addRow({ name: '轴承供应商', contact_person: '张三', phone: '13800138000', address: '北京市' });
}

function addPartsTemplateSheets(wb) {
  // Sheet 1: 备件分类
  const ws1 = wb.addWorksheet('备件分类');
  ws1.columns = [
    { header: 'name', key: 'name', width: 20 },
    { header: 'parent_name', key: 'parent_name', width: 20 },
  ];
  ws1.getRow(1).font = { bold: true };
  ws1.addRow({ name: '轴承', parent_name: '' });
  ws1.addRow({ name: '密封件', parent_name: '轴承' });

  // Sheet 2: 备件（含单价）
  const ws2 = wb.addWorksheet('备件');
  ws2.columns = [
    { header: 'code', key: 'code', width: 15 },
    { header: 'name', key: 'name', width: 20 },
    { header: 'model', key: 'model', width: 15 },
    { header: 'specification', key: 'specification', width: 20 },
    { header: 'unit', key: 'unit', width: 10 },
    { header: 'category', key: 'category', width: 15 },
    { header: 'unit_price', key: 'unit_price', width: 12 },
    { header: 'min_stock', key: 'min_stock', width: 12 },
    { header: 'max_stock', key: 'max_stock', width: 12 },
    { header: 'stock_quantity', key: 'stock_quantity', width: 14 },
  ];
  ws2.getRow(1).font = { bold: true };
  ws2.addRow({ code: '1001', name: '轴承 6205', model: '6205-2RS', specification: '内径25mm', unit: '个', category: '轴承', unit_price: '15.50', min_stock: '10', max_stock: '100', stock_quantity: '50' });

  // Sheet 3: 备件供应商
  const ws3 = wb.addWorksheet('备件供应商');
  ws3.columns = [
    { header: 'part_code', key: 'part_code', width: 15 },
    { header: 'supplier_name', key: 'supplier_name', width: 20 },
  ];
  ws3.getRow(1).font = { bold: true };
  ws3.addRow({ part_code: '1001', supplier_name: '轴承供应商' });

  // Sheet 4: 库位
  const ws4 = wb.addWorksheet('库位');
  ws4.columns = [
    { header: 'warehouse', key: 'warehouse', width: 15 },
    { header: 'shelf', key: 'shelf', width: 15 },
    { header: 'bin', key: 'bin', width: 15 },
    { header: 'type', key: 'type', width: 15 },
  ];
  ws4.getRow(1).font = { bold: true };
  ws4.addRow({ warehouse: '1号仓库', shelf: 'A货架', bin: 'A-01', type: 'normal' });

  // Sheet 5: 库存
  const ws5 = wb.addWorksheet('库存');
  ws5.columns = [
    { header: 'part_code', key: 'part_code', width: 15 },
    { header: 'warehouse', key: 'warehouse', width: 15 },
    { header: 'shelf', key: 'shelf', width: 15 },
    { header: 'bin', key: 'bin', width: 15 },
    { header: 'quantity', key: 'quantity', width: 12 },
  ];
  ws5.getRow(1).font = { bold: true };
  ws5.addRow({ part_code: '1001', warehouse: '1号仓库', shelf: 'A货架', bin: 'A-01', quantity: '50' });

  // Sheet 6: 工具（含单价和数量）
  const ws6 = wb.addWorksheet('工具');
  ws6.columns = [
    { header: 'code', key: 'code', width: 15 },
    { header: 'name', key: 'name', width: 20 },
    { header: 'model', key: 'model', width: 15 },
    { header: 'category', key: 'category', width: 15 },
    { header: 'location', key: 'location', width: 20 },
    { header: 'unit_price', key: 'unit_price', width: 12 },
    { header: 'quantity', key: 'quantity', width: 10 },
  ];
  ws6.getRow(1).font = { bold: true };
  ws6.addRow({ code: 'T001', name: '扳手', model: '12寸', category: '手动工具', location: '1号仓库-A货架', unit_price: '25.00', quantity: '5' });
}


// ──────────────────────────────────────────────
// 2. EXPORT
// ──────────────────────────────────────────────
export const downloadExport = async (req, res, next) => {
  try {
    const type = req.query.type; // 'equipment' | 'parts' | undefined
    const wb = new ExcelJS.Workbook();

    if (!type || type === 'equipment') {
      await fillEquipmentExportSheets(wb);
    }

    if (!type || type === 'parts') {
      await fillPartsExportSheets(wb);
    }

    const filename = getExportFilename(type);
    const encodedName = encodeURIComponent(filename);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedName}`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
};

function getExportFilename(type) {
  if (type === 'equipment') return '设备数据.xlsx';
  if (type === 'parts') return '备件数据.xlsx';
  return '全部数据.xlsx';
}

async function fillEquipmentExportSheets(wb) {
  // Sheet 1: 系统分类
  const ws1 = wb.addWorksheet('系统分类');
  ws1.columns = [
    { header: 'name', key: 'name', width: 20 },
    { header: 'parent_name', key: 'parent_name', width: 20 },
  ];
  ws1.getRow(1).font = { bold: true };

  const categories = await db('system_categories')
    .leftJoin('system_categories as sc2', 'system_categories.parent_id', 'sc2.id')
    .select('system_categories.name', db.raw('COALESCE("sc2"."name", \'\') as parent_name'))
    .orderBy('system_categories.name');

  if (categories.length) {
    categories.forEach(c => ws1.addRow({ name: c.name, parent_name: c.parent_name }));
  }

  // Sheet 2: 设备
  const ws2 = wb.addWorksheet('设备');
  ws2.columns = [
    { header: 'code', key: 'code', width: 15 },
    { header: 'name', key: 'name', width: 20 },
    { header: 'model', key: 'model', width: 15 },
    { header: 'location', key: 'location', width: 15 },
    { header: 'system_category', key: 'system_category', width: 15 },
  ];
  ws2.getRow(1).font = { bold: true };

  const equipment = await db('equipment')
    .leftJoin('system_categories', 'equipment.system_category_id', 'system_categories.id')
    .select('equipment.code', 'equipment.name', 'equipment.model', 'equipment.location', db.raw('COALESCE("system_categories"."name", \'\') as system_category'))
    .orderBy('equipment.code');

  if (equipment.length) {
    equipment.forEach(e => ws2.addRow({ code: e.code, name: e.name, model: e.model, location: e.location, system_category: e.system_category }));
  }

  // Sheet 3: 设备备件
  const ws3 = wb.addWorksheet('设备备件');
  ws3.columns = [
    { header: 'equipment_code', key: 'equipment_code', width: 15 },
    { header: 'part_code', key: 'part_code', width: 15 },
  ];
  ws3.getRow(1).font = { bold: true };

  const equipmentParts = await db('part_equipment')
    .join('equipment', 'part_equipment.equipment_id', 'equipment.id')
    .join('parts', 'part_equipment.part_id', 'parts.id')
    .select('equipment.code as equipment_code', 'parts.code as part_code')
    .orderBy('equipment.code');

  if (equipmentParts.length) {
    equipmentParts.forEach(ep => ws3.addRow({ equipment_code: ep.equipment_code, part_code: ep.part_code }));
  }

  // Sheet 4: 供应商
  const ws4 = wb.addWorksheet('供应商');
  ws4.columns = [
    { header: 'name', key: 'name', width: 20 },
    { header: 'contact_person', key: 'contact_person', width: 15 },
    { header: 'phone', key: 'phone', width: 18 },
    { header: 'address', key: 'address', width: 30 },
  ];
  ws4.getRow(1).font = { bold: true };

  const suppliers = await db('suppliers').orderBy('name');

  if (suppliers.length) {
    suppliers.forEach(s => ws4.addRow({ name: s.name, contact_person: s.contact_person, phone: s.phone, address: s.address }));
  }
}

async function fillPartsExportSheets(wb) {
  // Sheet 1: 备件分类
  const ws1 = wb.addWorksheet('备件分类');
  ws1.columns = [
    { header: 'name', key: 'name', width: 20 },
    { header: 'parent_name', key: 'parent_name', width: 20 },
  ];
  ws1.getRow(1).font = { bold: true };

  const partCategories = await db('part_categories')
    .leftJoin('part_categories as pc2', 'part_categories.parent_id', 'pc2.id')
    .select('part_categories.name', db.raw('COALESCE("pc2"."name", \'\') as parent_name'))
    .orderBy('part_categories.name');

  if (partCategories.length) {
    partCategories.forEach(pc => ws1.addRow({ name: pc.name, parent_name: pc.parent_name }));
  }

  // Sheet 2: 备件
  const ws2 = wb.addWorksheet('备件');
  ws2.columns = [
    { header: 'code', key: 'code', width: 15 },
    { header: 'name', key: 'name', width: 20 },
    { header: 'model', key: 'model', width: 15 },
    { header: 'specification', key: 'specification', width: 20 },
    { header: 'unit', key: 'unit', width: 10 },
    { header: 'category', key: 'category', width: 15 },
    { header: 'min_stock', key: 'min_stock', width: 12 },
    { header: 'max_stock', key: 'max_stock', width: 12 },
  ];
  ws2.getRow(1).font = { bold: true };

  const parts = await db('parts')
    .leftJoin('part_categories', 'parts.category_id', 'part_categories.id')
    .select('parts.code', 'parts.name', 'parts.model', 'parts.specification', 'parts.unit', db.raw('COALESCE("part_categories"."name", \'\') as category'), 'parts.min_stock', 'parts.max_stock')
    .orderBy('parts.code');

  if (parts.length) {
    parts.forEach(p => ws2.addRow({ code: p.code, name: p.name, model: p.model, specification: p.specification, unit: p.unit, category: p.category, min_stock: p.min_stock, max_stock: p.max_stock }));
  }

  // Sheet 3: 备件供应商
  const ws3 = wb.addWorksheet('备件供应商');
  ws3.columns = [
    { header: 'part_code', key: 'part_code', width: 15 },
    { header: 'supplier_name', key: 'supplier_name', width: 20 },
  ];
  ws3.getRow(1).font = { bold: true };

  const partSuppliers = await db('part_suppliers')
    .join('parts', 'part_suppliers.part_id', 'parts.id')
    .join('suppliers', 'part_suppliers.supplier_id', 'suppliers.id')
    .select('parts.code as part_code', 'suppliers.name as supplier_name')
    .orderBy('parts.code');

  if (partSuppliers.length) {
    partSuppliers.forEach(ps => ws3.addRow({ part_code: ps.part_code, supplier_name: ps.supplier_name }));
  }

  // Sheet 4: 库位
  const ws4 = wb.addWorksheet('库位');
  ws4.columns = [
    { header: 'warehouse', key: 'warehouse', width: 15 },
    { header: 'shelf', key: 'shelf', width: 15 },
    { header: 'bin', key: 'bin', width: 15 },
    { header: 'type', key: 'type', width: 15 },
  ];
  ws4.getRow(1).font = { bold: true };

  const locations = await db('locations').orderBy('warehouse').orderBy('shelf').orderBy('bin');

  if (locations.length) {
    locations.forEach(l => ws4.addRow({ warehouse: l.warehouse, shelf: l.shelf, bin: l.bin, type: l.type }));
  }

  // Sheet 5: 库存
  const ws5 = wb.addWorksheet('库存');
  ws5.columns = [
    { header: 'part_code', key: 'part_code', width: 15 },
    { header: 'warehouse', key: 'warehouse', width: 15 },
    { header: 'shelf', key: 'shelf', width: 15 },
    { header: 'bin', key: 'bin', width: 15 },
    { header: 'quantity', key: 'quantity', width: 12 },
  ];
  ws5.getRow(1).font = { bold: true };

  const stockRecords = await db('stock_records')
    .join('parts', 'stock_records.part_id', 'parts.id')
    .join('locations', 'stock_records.location_id', 'locations.id')
    .select('parts.code as part_code', 'locations.warehouse', 'locations.shelf', 'locations.bin', 'stock_records.quantity')
    .orderBy('parts.code');

  if (stockRecords.length) {
    stockRecords.forEach(sr => ws5.addRow({ part_code: sr.part_code, warehouse: sr.warehouse, shelf: sr.shelf, bin: sr.bin, quantity: Number(sr.quantity) }));
  }

  // Sheet 6: 工具
  const ws6 = wb.addWorksheet('工具');
  ws6.columns = [
    { header: 'code', key: 'code', width: 15 },
    { header: 'name', key: 'name', width: 20 },
    { header: 'model', key: 'model', width: 15 },
    { header: 'category', key: 'category', width: 15 },
    { header: 'location', key: 'location', width: 20 },
  ];
  ws6.getRow(1).font = { bold: true };

  const tools = await db('tools').orderBy('code');

  if (tools.length) {
    tools.forEach(t => ws6.addRow({ code: t.code, name: t.name, model: t.model, category: t.category, location: t.location }));
  }
}

// ──────────────────────────────────────────────
// 3. IMPORT
// ──────────────────────────────────────────────
export const uploadImport = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: '请上传有效的 Excel 文件' });
    }

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(req.file.buffer);

    // Detect template type from sheet names
    const sheetNames = wb.worksheets.map(ws => ws.name);
    const hasEquipment = sheetNames.includes('设备');
    const hasParts = sheetNames.includes('备件');
    const hasSystemCategory = sheetNames.includes('系统分类');
    const hasPartCategory = sheetNames.includes('备件分类');

    if (!hasSystemCategory && !hasPartCategory) {
      return res.status(400).json({ error: '无法识别的模板格式，请使用模板文件导入' });
    }

    const results = { imported: {}, errors: [] };
    let successCount = 0;

    if (hasSystemCategory) {
      results.imported.系统分类 = { total: 0, success: 0 };
    }
    if (hasEquipment) {
      results.imported.设备 = { total: 0, success: 0 };
    }
    if (sheetNames.includes('设备备件')) {
      results.imported['设备备件'] = { total: 0, success: 0 };
    }
    if (sheetNames.includes('供应商')) {
      results.imported.供应商 = { total: 0, success: 0 };
    }
    if (hasPartCategory) {
      results.imported.备件分类 = { total: 0, success: 0 };
    }
    if (hasParts) {
      results.imported.备件 = { total: 0, success: 0 };
    }
    if (sheetNames.includes('备件供应商')) {
      results.imported['备件供应商'] = { total: 0, success: 0 };
    }
    if (sheetNames.includes('库位')) {
      results.imported.库位 = { total: 0, success: 0 };
    }
    if (sheetNames.includes('库存')) {
      results.imported.库存 = { total: 0, success: 0 };
    }
    if (sheetNames.includes('工具')) {
      results.imported.工具 = { total: 0, success: 0 };
    }

    // Use a transaction for the entire import
    await db.transaction(async (trx) => {
      // ── 1. Import 系统分类 ──
      if (hasSystemCategory) {
        const rows = getSheetRows(wb, '系统分类');
        results.imported.系统分类.total = rows.length;

        // First pass: create categories without parent (parent_name empty)
        const createdIds = {};
        for (const row of rows) {
          const name = String(row.name || '').trim();
          if (!name) {
            results.errors.push(`系统分类: 跳过空名称行`);
            continue;
          }
          try {
            const id = await insertAndGetId(trx, 'system_categories', { name });
            createdIds[name] = id;
            results.imported.系统分类.success++;
            successCount++;
          } catch (e) {
            results.errors.push(`系统分类 "${name}": ${e.message}`);
          }
        }

        // Second pass: update parent_id where parent_name is specified
        for (const row of rows) {
          const name = String(row.name || '').trim();
          const parentName = String(row.parent_name || '').trim();
          if (name && parentName && createdIds[name] && createdIds[parentName]) {
            try {
              await trx('system_categories').where({ id: createdIds[name] }).update({ parent_id: createdIds[parentName] });
            } catch (e) {
              results.errors.push(`系统分类 "${name}" 设置父分类失败: ${e.message}`);
            }
          }
        }
      }

      // ── 2. Import 设备 ──
      if (hasEquipment) {
        const rows = getSheetRows(wb, '设备');
        results.imported.设备.total = rows.length;

        for (const row of rows) {
          const code = String(row.code || '').trim();
          const name = String(row.name || '').trim();
          if (!code || !name) {
            results.errors.push(`设备: 跳过缺少编码或名称的行`);
            continue;
          }
          try {
            let system_category_id = null;
            const catName = String(row.system_category || '').trim();
            if (catName) {
              const cat = await trx('system_categories').where({ name: catName }).first();
              if (cat) system_category_id = cat.id;
            }
            await insertAndGetId(trx, 'equipment', {
              code,
              name,
              model: String(row.model || '').trim() || null,
              location: String(row.location || '').trim() || null,
              system_category_id,
            }).onConflict('code').ignore().returning('id');
            
            results.imported.设备.success++;
            successCount++;
          } catch (e) {
            results.errors.push(`设备 "${code}": ${e.message}`);
          }
        }
      }

      // ── 3. Import 设备备件 ──
      if (sheetNames.includes('设备备件')) {
        const rows = getSheetRows(wb, '设备备件');
        results.imported['设备备件'].total = rows.length;

        for (const row of rows) {
          const equipmentCode = String(row.equipment_code || '').trim();
          const partCode = String(row.part_code || '').trim();
          if (!equipmentCode || !partCode) {
            results.errors.push(`设备备件: 跳过缺少设备编码或备件编码的行`);
            continue;
          }
          try {
            const equipment = await trx('equipment').where({ code: equipmentCode }).first();
            const part = await trx('parts').where({ code: partCode }).first();
            if (!equipment) {
              results.errors.push(`设备备件: 设备编码 "${equipmentCode}" 不存在`);
              continue;
            }
            if (!part) {
              results.errors.push(`设备备件: 备件编码 "${partCode}" 不存在`);
              continue;
            }
            // Avoid duplicates
            const existing = await trx('part_equipment')
              .where({ equipment_id: equipment.id, part_id: part.id })
              .first();
            if (!existing) {
              await trx('part_equipment').insert({ equipment_id: equipment.id, part_id: part.id });
            }
            results.imported['设备备件'].success++;
            successCount++;
          } catch (e) {
            results.errors.push(`设备备件 ${equipmentCode}/${partCode}: ${e.message}`);
          }
        }
      }

      // ── 4. Import 供应商 ──
      if (sheetNames.includes('供应商')) {
        const rows = getSheetRows(wb, '供应商');
        results.imported.供应商.total = rows.length;

        for (const row of rows) {
          const name = String(row.name || '').trim();
          if (!name) {
            results.errors.push(`供应商: 跳过空名称行`);
            continue;
          }
          try {
            await insertAndGetId(trx, 'suppliers', {
              name,
              contact_person: String(row.contact_person || '').trim() || null,
              phone: String(row.phone || '').trim() || null,
              address: String(row.address || '').trim() || null,
            });
            results.imported.供应商.success++;
            successCount++;
          } catch (e) {
            results.errors.push(`供应商 "${name}": ${e.message}`);
          }
        }
      }

      // ── 5. Import 备件分类 ──
      if (hasPartCategory) {
        const rows = getSheetRows(wb, '备件分类');
        results.imported.备件分类.total = rows.length;

        const createdIds = {};
        for (const row of rows) {
          const name = String(row.name || '').trim();
          if (!name) {
            results.errors.push(`备件分类: 跳过空名称行`);
            continue;
          }
          try {
            const id = await insertAndGetId(trx, 'part_categories', { name });
            createdIds[name] = id;
            results.imported.备件分类.success++;
            successCount++;
          } catch (e) {
            results.errors.push(`备件分类 "${name}": ${e.message}`);
          }
        }

        for (const row of rows) {
          const name = String(row.name || '').trim();
          const parentName = String(row.parent_name || '').trim();
          if (name && parentName && createdIds[name] && createdIds[parentName]) {
            try {
              await trx('part_categories').where({ id: createdIds[name] }).update({ parent_id: createdIds[parentName] });
            } catch (e) {
              results.errors.push(`备件分类 "${name}" 设置父分类失败: ${e.message}`);
            }
          }
        }
      }

      // ── 6. Import 备件 ──
      if (hasParts) {
        const rows = getSheetRows(wb, '备件');
        results.imported.备件.total = rows.length;

        for (const row of rows) {
          const code = String(row.code || '').trim();
          const name = String(row.name || '').trim();
          if (!code || !name) {
            results.errors.push(`备件: 跳过缺少编码或名称的行`);
            continue;
          }

            try {
            let category_id = null;
            const catName = String(row.category || '').trim();
            if (catName) {
              const cat = await trx('part_categories').where({ name: catName }).first();
              if (cat) category_id = cat.id;
            }
            const [partId] = await trx('parts').insert({
              code,
              name,
              model: String(row.model || '').trim() || null,
              specification: String(row.specification || '').trim() || null,
              unit: String(row.unit || '').trim() || null,
              category_id,
              min_stock: row.min_stock != null && row.min_stock !== '' ? Number(row.min_stock) : null,
              max_stock: row.max_stock != null && row.max_stock !== '' ? Number(row.max_stock) : null,
            });

            // Handle stock_quantity if provided (initial stock)
            const stockQty = row.stock_quantity != null && row.stock_quantity !== ''
              ? Number(row.stock_quantity) : 0;
            if (stockQty > 0) {
              // Check if a stock sheet exists with this part's code
              const hasStockSheet = sheetNames.includes('库存');
              if (!hasStockSheet) {
                // Try to find first available location
                const firstLocation = await trx('locations').orderBy('id').first();
                if (firstLocation) {
                  await trx('stock_records').insert({
                    part_id: partId,
                    location_id: firstLocation.id,
                    quantity: stockQty,
                  });
                }
              }
            }

            results.imported.备件.success++;
            successCount++;
          } catch (e) {
            results.errors.push(`备件 "${code}": ${e.message}`);
          }
        }
      }

      // ── 7. Import 备件供应商 ──
      if (sheetNames.includes('备件供应商')) {
        const rows = getSheetRows(wb, '备件供应商');
        results.imported['备件供应商'].total = rows.length;

        for (const row of rows) {
          const partCode = String(row.part_code || '').trim();
          const supplierName = String(row.supplier_name || '').trim();
          if (!partCode || !supplierName) {
            results.errors.push(`备件供应商: 跳过缺少备件编码或供应商名称的行`);
            continue;
          }
          try {
            const part = await trx('parts').where({ code: partCode }).first();
            const supplier = await trx('suppliers').where({ name: supplierName }).first();
            if (!part) {
              results.errors.push(`备件供应商: 备件编码 "${partCode}" 不存在`);
              continue;
            }
            if (!supplier) {
              results.errors.push(`备件供应商: 供应商 "${supplierName}" 不存在`);
              continue;
            }
            const existing = await trx('part_suppliers')
              .where({ part_id: part.id, supplier_id: supplier.id })
              .first();
            if (!existing) {
              await trx('part_suppliers').insert({ part_id: part.id, supplier_id: supplier.id });
            }
            results.imported['备件供应商'].success++;
            successCount++;
          } catch (e) {
            results.errors.push(`备件供应商 ${partCode}/${supplierName}: ${e.message}`);
          }
        }
      }

      // ── 8. Import 库位 ──
      if (sheetNames.includes('库位')) {
        const rows = getSheetRows(wb, '库位');
        results.imported.库位.total = rows.length;

        for (const row of rows) {
          const warehouse = String(row.warehouse || '').trim();
          const shelf = String(row.shelf || '').trim();
          const bin = String(row.bin || '').trim();
          if (!warehouse || !shelf || !bin) {
            results.errors.push(`库位: 跳过缺少仓库/货架/库位编号的行`);
            continue;
          }
          try {
            const existing = await trx('locations')
              .where({ warehouse, shelf, bin })
              .first();
            if (!existing) {
              await insertAndGetId(trx, 'locations', {
                warehouse,
                shelf,
                bin,
                type: String(row.type || '').trim() || 'normal',
              });
            }
            results.imported.库位.success++;
            successCount++;
          } catch (e) {
            results.errors.push(`库位 ${warehouse}/${shelf}/${bin}: ${e.message}`);
          }
        }
      }

      // ── 9. Import 库存 ──
      if (sheetNames.includes('库存')) {
        const rows = getSheetRows(wb, '库存');
        results.imported.库存.total = rows.length;

        for (const row of rows) {
          const partCode = String(row.part_code || '').trim();
          const warehouse = String(row.warehouse || '').trim();
          const shelf = String(row.shelf || '').trim();
          const bin = String(row.bin || '').trim();
          const quantity = row.quantity != null && row.quantity !== '' ? Number(row.quantity) : 0;
          if (!partCode || !warehouse || !shelf || !bin) {
            results.errors.push(`库存: 跳过缺少必要字段的行`);
            continue;
          }
          try {
            const part = await trx('parts').where({ code: partCode }).first();
            if (!part) {
              results.errors.push(`库存: 备件编码 "${partCode}" 不存在`);
              continue;
            }
            const location = await trx('locations')
              .where({ warehouse, shelf, bin })
              .first();
            if (!location) {
              results.errors.push(`库存: 库位 "${warehouse}/${shelf}/${bin}" 不存在`);
              continue;
            }

            // Check for existing stock record at this part+location
            const existingStock = await trx('stock_records')
              .where({ part_id: part.id, location_id: location.id })
              .first();
            if (existingStock) {
              await trx('stock_records')
                .where({ id: existingStock.id })
                .update({ quantity });
            } else {
              await trx('stock_records').insert({
                part_id: part.id,
                location_id: location.id,
                quantity,
              });
            }
            results.imported.库存.success++;
            successCount++;
          } catch (e) {
            results.errors.push(`库存 ${partCode}@${warehouse}/${shelf}/${bin}: ${e.message}`);
          }
        }
      }

      // ── 10. Import 工具 ──
      if (sheetNames.includes('工具')) {
        const rows = getSheetRows(wb, '工具');
        results.imported.工具.total = rows.length;

        for (const row of rows) {
          const code = String(row.code || '').trim();
          const name = String(row.name || '').trim();
          if (!code || !name) {
            results.errors.push(`工具: 跳过缺少编码或名称的行`);
            continue;
          }
          try {
            await insertAndGetId(trx, 'tools', {
              code,
              name,
              model: String(row.model || '').trim() || null,
              category: String(row.category || '').trim() || null,
              location: String(row.location || '').trim() || null,
            });
            results.imported.工具.success++;
            successCount++;
          } catch (e) {
            results.errors.push(`工具 "${code}": ${e.message}`);
          }
        }
      }
    });

    res.json({
      success: true,
      message: `导入完成，成功导入 ${successCount} 条记录`,
      details: results,
    });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────
// Helper: extract data rows from a worksheet (skip header row)
// ──────────────────────────────────────────────
function getSheetRows(wb, sheetName) {
  const ws = wb.getWorksheet(sheetName);
  if (!ws) return [];

  const rows = [];
  const headerRow = ws.getRow(1);
  const keys = [];
  headerRow.eachCell((cell) => {
    keys.push(cell.text);
  });

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const obj = {};
    row.eachCell((cell, colNumber) => {
      const key = keys[colNumber - 1];
      if (key != null) {
        obj[key] = cell.text;
      }
    });
    // Only add rows that have at least one non-empty value
    const hasValue = Object.values(obj).some(v => v != null && String(v).trim() !== '');
    if (hasValue) {
      rows.push(obj);
    }
  });

  return rows;
}
