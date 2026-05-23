import db from '../config/database.js';

export const list = async (req, res, next) => {
  try {
    const query = db('locations').orderBy(['warehouse', 'shelf', 'bin']);
    if (req.query.warehouse) {
      query.where({ warehouse: req.query.warehouse });
    }
    const items = await query;
    res.json(items);
  } catch (err) { next(err); }
};

export const tree = async (req, res, next) => {
  try {
    const locations = await db('locations').orderBy(['warehouse', 'shelf', 'bin']);

    // 查询每个库位的备件库存统计
    const stockCounts = await db('stock_records')
      .select('location_id')
      .countDistinct('part_id as part_count')
      .groupBy('location_id');

    // 查询每个位置对应的工具数量
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

    const warehouseMap = {};
    for (const loc of locations) {
      if (!warehouseMap[loc.warehouse]) {
        warehouseMap[loc.warehouse] = {};
      }
      if (!warehouseMap[loc.warehouse][loc.shelf]) {
        warehouseMap[loc.warehouse][loc.shelf] = [];
      }
      warehouseMap[loc.warehouse][loc.shelf].push({
        id: loc.id,
        name: loc.bin,
        type: loc.type,
        part_count: stockCountMap[loc.id] || 0,
        tool_count: toolCountMap[loc.bin] || 0,
      });
    }
    const result = Object.entries(warehouseMap).map(([warehouseName, shelves]) => ({
      name: warehouseName,
      shelves: Object.entries(shelves).map(([shelfName, bins]) => ({
        name: shelfName,
        bins,
      })),
    }));
    res.json(result);
  } catch (err) { next(err); }
};

export const getById = async (req, res, next) => {
  try {
    const item = await db('locations').where({ id: req.params.id }).first();
    if (!item) return res.status(404).json({ error: '位置不存在' });
    res.json(item);
  } catch (err) { next(err); }
};

export const create = async (req, res, next) => {
  try {
    const { warehouse, shelf, bin, type = 'normal' } = req.body;
    const insertResult = await db('locations').insert({ warehouse, shelf, bin, type }).returning('id');
    const id = insertResult?.[0]?.id ?? insertResult?.id ?? insertResult;
    res.status(201).json({ id });
  } catch (err) { next(err); }
};

export const update = async (req, res, next) => {
  try {
    const existing = await db('locations').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: '位置不存在' });
    await db('locations').where({ id: req.params.id }).update(req.body);
    res.json({ success: true });
  } catch (err) { next(err); }
};

export const remove = async (req, res, next) => {
  try {
    const existing = await db('locations').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: '位置不存在' });
    await db('locations').where({ id: req.params.id }).del();
    res.json({ success: true });
  } catch (err) { next(err); }
};

export const transfer = async (req, res, next) => {
  try {
    const { part_id, from_location_id, to_location_id, quantity } = req.body;
    await db.transaction(async trx => {
      const sourceStock = await trx('stock_records')
        .where({ part_id, location_id: from_location_id })
        .first();
      if (!sourceStock || Number(sourceStock.quantity) < Number(quantity)) {
        throw Object.assign(new Error('库存不足'), { status: 400 });
      }
      await trx('stock_records')
        .where({ part_id, location_id: from_location_id })
        .decrement('quantity', quantity);
      const destStock = await trx('stock_records')
        .where({ part_id, location_id: to_location_id })
        .first();
      if (destStock) {
        await trx('stock_records')
          .where({ part_id, location_id: to_location_id })
          .increment('quantity', quantity);
      } else {
        await trx('stock_records').insert({
          part_id,
          location_id: to_location_id,
          quantity,
        });
      }
    });
    res.json({ success: true });
  } catch (err) { next(err); }
};
