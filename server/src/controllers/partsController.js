import db from '../config/database.js';
import { generateNextCode } from '../utils/codeGenerator.js';

export const list = async (req, res, next) => {
  try {
    const { keyword, category_id, page = 1, page_size = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.max(1, parseInt(page_size, 10) || 20);
    const offset = (pageNum - 1) * limit;

    let query = db('parts')
      .leftJoin('part_categories', 'parts.category_id', 'part_categories.id')
      .leftJoin('stock_records', 'parts.id', 'stock_records.part_id')
      .select(
        'parts.id',
        'parts.code',
        'parts.name',
        'parts.model',
        'parts.specification',
        'parts.unit',
        'parts.category_id',
        'parts.min_stock',
        'parts.max_stock',
        'parts.unit_price',
        'part_categories.name as category_name',
        db.raw('COALESCE(SUM(stock_records.quantity), 0) as current_stock')
      )
      .groupBy('parts.id', 'part_categories.name')
      .orderBy('parts.code');

    if (keyword) {
      query = query.where(function () {
        this.where('parts.name', 'ilike', `%${keyword}%`)
          .orWhere('parts.code', 'ilike', `%${keyword}%`)
          .orWhere('parts.model', 'ilike', `%${keyword}%`);
      });
    }

    if (category_id) {
      query = query.where('parts.category_id', category_id);
    }

    // Clone for count query
    let countQuery = db('parts');
    if (keyword) {
      countQuery = countQuery.where(function () {
        this.where('parts.name', 'ilike', `%${keyword}%`)
          .orWhere('parts.code', 'ilike', `%${keyword}%`)
          .orWhere('parts.model', 'ilike', `%${keyword}%`);
      });
    }
    if (category_id) {
      countQuery = countQuery.where('parts.category_id', category_id);
    }
    const [{ count }] = await countQuery.count('* as count');

    const rows = await query.limit(limit).offset(offset);

    const items = rows.map(item => ({
      ...item,
      current_stock: Number(item.current_stock),
      stock_status: Number(item.current_stock) <= Number(item.min_stock) ? 'low' : 'normal'
    }));

    res.json({ items, total: Number(count), page: pageNum, page_size: limit });
  } catch (err) { next(err); }
};

export const getById = async (req, res, next) => {
  try {
    const part = await db('parts')
      .leftJoin('part_categories', 'parts.category_id', 'part_categories.id')
      .select('parts.*', 'part_categories.name as category_name')
      .where('parts.id', req.params.id)
      .first();

    if (!part) return res.status(404).json({ error: '备件不存在' });

    // Get total stock
    const stockResult = await db('stock_records')
      .where({ part_id: part.id })
      .sum('quantity as total')
      .first();
    part.current_stock = Number(stockResult?.total || 0);

    const suppliers = await db('part_suppliers')
      .join('suppliers', 'part_suppliers.supplier_id', 'suppliers.id')
      .where('part_suppliers.part_id', part.id)
      .select('suppliers.id', 'suppliers.name');

    const equipment = await db('part_equipment')
      .join('equipment', 'part_equipment.equipment_id', 'equipment.id')
      .where('part_equipment.part_id', part.id)
      .select('equipment.id', 'equipment.name', 'equipment.code');

    const stock_by_location = await db('stock_records')
      .join('locations', 'stock_records.location_id', 'locations.id')
      .where('stock_records.part_id', part.id)
      .select(
        'stock_records.location_id',
        'locations.warehouse',
        'locations.shelf',
        'locations.bin',
        'stock_records.quantity'
      );

    part.suppliers = suppliers;
    part.equipment = equipment;
    part.stock_by_location = stock_by_location;

    res.json(part);
  } catch (err) { next(err); }
};

export const create = async (req, res, next) => {
  try {
    let { code, name, model, specification, unit, category_id, min_stock, max_stock, unit_price, supplier_ids, equipment_ids } = req.body;
    if (!code) {
      code = await generateNextCode('parts', 'P');
    }
    const insertResult = await db('parts').insert({ code, name, model, specification, unit, category_id, min_stock, max_stock, unit_price: unit_price || null }).returning('id');
    const id = insertResult?.[0]?.id ?? insertResult?.id ?? insertResult;

    if (supplier_ids?.length) {
      const supplierInserts = supplier_ids.map(sid => ({ part_id: id, supplier_id: sid }));
      await db('part_suppliers').insert(supplierInserts);
    }

    if (equipment_ids?.length) {
      const equipmentInserts = equipment_ids.map(eid => ({ part_id: id, equipment_id: eid }));
      await db('part_equipment').insert(equipmentInserts);
    }

    res.status(201).json({ id });
  } catch (err) { next(err); }
};

export const update = async (req, res, next) => {
  try {
    const existing = await db('parts').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: '备件不存在' });

    const { supplier_ids, equipment_ids, ...partFields } = req.body;

    if (Object.keys(partFields).length) {
      await db('parts').where({ id: req.params.id }).update(partFields);
    }

    if (supplier_ids) {
      await db('part_suppliers').where({ part_id: req.params.id }).del();
      if (supplier_ids.length) {
        const supplierInserts = supplier_ids.map(sid => ({ part_id: +req.params.id, supplier_id: sid }));
        await db('part_suppliers').insert(supplierInserts);
      }
    }

    if (equipment_ids) {
      await db('part_equipment').where({ part_id: req.params.id }).del();
      if (equipment_ids.length) {
        const equipmentInserts = equipment_ids.map(eid => ({ part_id: +req.params.id, equipment_id: eid }));
        await db('part_equipment').insert(equipmentInserts);
      }
    }

    res.json({ success: true });
  } catch (err) { next(err); }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await db('parts').where({ id }).first();
    if (!existing) return res.status(404).json({ error: '备件不存在' });

    // Check for related records before deletion
    const relatedTables = [
      { table: 'stock_records', column: 'part_id', label: '库存记录' },
      { table: 'inbound_records', column: 'part_id', label: '入库记录' },
      { table: 'outbound_records', column: 'part_id', label: '出库记录' },
      { table: 'purchase_order_items', column: 'part_id', label: '采购单条目' },
      { table: 'work_order_parts', column: 'part_id', label: '工单备件' },
      { table: 'part_suppliers', column: 'part_id', label: '供应商关联' },
      { table: 'part_equipment', column: 'part_id', label: '设备关联' },
    ];

    const conflicts = [];
    for (const { table, column, label } of relatedTables) {
      const [{ count }] = await db(table).where(column, id).count('* as count');
      if (Number(count) > 0) {
        conflicts.push(`${label}(${count})`);
      }
    }

    if (conflicts.length > 0) {
      return res.status(400).json({
        error: `该备件存在关联数据，无法删除：${conflicts.join('，')}`,
        details: conflicts,
      });
    }

    // Also clean up junction tables
    await db('part_suppliers').where({ part_id: id }).del();
    await db('part_equipment').where({ part_id: id }).del();

    await db('parts').where({ id }).del();
    res.json({ success: true });
  } catch (err) { next(err); }
};

export const getNextCode = async (req, res, next) => {
  try {
    const code = await generateNextCode('parts', 'P');
    res.json({ code });
  } catch (err) { next(err); }
};

export const listCategories = async (req, res, next) => {
  try {
    const items = await db('part_categories').orderBy('name');
    const map = {};
    const roots = [];
    items.forEach(item => {
      map[item.id] = { ...item, children: [] };
    });
    items.forEach(item => {
      if (item.parent_id && map[item.parent_id]) {
        map[item.parent_id].children.push(map[item.id]);
      } else if (!item.parent_id) {
        roots.push(map[item.id]);
      }
    });
    res.json(roots);
  } catch (err) { next(err); }
};

export const createCategory = async (req, res, next) => {
  try {
    const { name, parent_id } = req.body;
    const insertResult = await db('part_categories').insert({ name, parent_id }).returning('id');
    const id = insertResult?.[0]?.id ?? insertResult?.id ?? insertResult;
    res.status(201).json({ id });
  } catch (err) { next(err); }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { name, parent_id } = req.body;
    const existing = await db('part_categories').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: '分类不存在' });
    await db('part_categories').where({ id: req.params.id }).update({ name, parent_id });
    res.json({ success: true });
  } catch (err) { next(err); }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const existing = await db('part_categories').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: '分类不存在' });

    // Check if category has children
    const children = await db('part_categories').where({ parent_id: req.params.id });
    if (children.length > 0) {
      return res.status(400).json({ error: '该分类下有子分类，请先删除子分类' });
    }

    // Check if category has parts
    const parts = await db('parts').where({ category_id: req.params.id });
    if (parts.length > 0) {
      return res.status(400).json({ error: '该分类下有备件，无法删除' });
    }

    await db('part_categories').where({ id: req.params.id }).del();
    res.json({ success: true });
  } catch (err) { next(err); }
};

