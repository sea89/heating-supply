import db from '../config/database.js';

export const list = async (req, res, next) => {
  try {
    const items = await db('suppliers').orderBy('name');
    res.json(items);
  } catch (err) { next(err); }
};

export const getById = async (req, res, next) => {
  try {
    const item = await db('suppliers').where({ id: req.params.id }).first();
    if (!item) return res.status(404).json({ error: '供应商不存在' });
    // 获取该供应商供应的备件
    const parts = await db('part_suppliers')
      .join('parts', 'part_suppliers.part_id', 'parts.id')
      .where('part_suppliers.supplier_id', item.id)
      .select('parts.id', 'parts.name', 'parts.code');
    item.supplied_parts = parts;
    res.json(item);
  } catch (err) { next(err); }
};

export const create = async (req, res, next) => {
  try {
    const { name, contact_person, phone, supply_category } = req.body;
    const insertResult = await db('suppliers').insert({ name, contact_person, phone, supply_category }).returning('id');
    const id = insertResult?.[0]?.id ?? insertResult?.id ?? insertResult;
    res.status(201).json({ id });
  } catch (err) { next(err); }
};

export const update = async (req, res, next) => {
  try {
    await db('suppliers').where({ id: req.params.id }).update(req.body);
    res.json({ success: true });
  } catch (err) { next(err); }
};

export const remove = async (req, res, next) => {
  try {
    await db('suppliers').where({ id: req.params.id }).del();
    res.json({ success: true });
  } catch (err) { next(err); }
};
