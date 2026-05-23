import db from '../config/database.js';
import { generateNextCode } from '../utils/codeGenerator.js';

export const list = async (req, res, next) => {
  try {
    const items = await db('equipment')
      .leftJoin('system_categories', 'equipment.system_category_id', 'system_categories.id')
      .select('equipment.*', 'system_categories.name as system_name')
      .orderBy('equipment.code');

    // 获取每个设备的关联备件
    for (const item of items) {
      const parts = await db('part_equipment')
        .join('parts', 'part_equipment.part_id', 'parts.id')
        .where('part_equipment.equipment_id', item.id)
        .select('parts.id', 'parts.name', 'parts.code');
      item.related_parts = parts;

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
    }
    res.json(items);
  } catch (err) { next(err); }
};

export const getNextCode = async (req, res, next) => {
  try {
    const code = await generateNextCode('equipment', 'E');
    res.json({ code });
  } catch (err) { next(err); }
};

export const getById = async (req, res, next) => {
  try {
    const item = await db('equipment').where({ id: req.params.id }).first();
    if (!item) return res.status(404).json({ error: '设备不存在' });
    const parts = await db('part_equipment')
      .join('parts', 'part_equipment.part_id', 'parts.id')
      .where('part_equipment.equipment_id', item.id)
      .select('parts.id', 'parts.name', 'parts.code');
    item.related_parts = parts;

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

    res.json(item);
  } catch (err) { next(err); }
};

export const create = async (req, res, next) => {
  try {
    let { code, name, model, location, system_category_id, part_ids } = req.body;
    if (!code) {
      code = await generateNextCode('equipment', 'E');
    }
    const insertResult = await db('equipment').insert({ code, name, model, location, system_category_id }).returning('id');
    const id = insertResult?.[0]?.id ?? insertResult?.id ?? insertResult;
    if (part_ids?.length) {
      const inserts = part_ids.map(pid => ({ equipment_id: id, part_id: pid }));
      await db('part_equipment').insert(inserts);
    }
    res.status(201).json({ id });
  } catch (err) { next(err); }
};

export const update = async (req, res, next) => {
  try {
    const { part_ids, ...equipmentFields } = req.body;
    await db('equipment').where({ id: req.params.id }).update(equipmentFields);
    if (part_ids) {
      await db('part_equipment').where({ equipment_id: req.params.id }).del();
      if (part_ids.length) {
        const inserts = part_ids.map(pid => ({ equipment_id: +req.params.id, part_id: pid }));
        await db('part_equipment').insert(inserts);
      }
    }
    res.json({ success: true });
  } catch (err) { next(err); }
};

export const remove = async (req, res, next) => {
  try {
    await db('equipment').where({ id: req.params.id }).del();
    res.json({ success: true });
  } catch (err) { next(err); }
};
