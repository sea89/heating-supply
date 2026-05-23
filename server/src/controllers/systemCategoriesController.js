import db from '../config/database.js';

export const list = async (req, res, next) => {
  try {
    const items = await db('system_categories').orderBy('name');
    res.json(items);
  } catch (err) { next(err); }
};

export const tree = async (req, res, next) => {
  try {
    const items = await db('system_categories').orderBy('name');
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

export const create = async (req, res, next) => {
  try {
    const { name, description, parent_id } = req.body;
    const insertResult = await db('system_categories').insert({ name, description, parent_id }).returning('id');
    const id = insertResult?.[0]?.id ?? insertResult?.id ?? insertResult;
    res.status(201).json({ id });
  } catch (err) { next(err); }
};

export const update = async (req, res, next) => {
  try {
    await db('system_categories').where({ id: req.params.id }).update(req.body);
    res.json({ success: true });
  } catch (err) { next(err); }
};

export const remove = async (req, res, next) => {
  try {
    await db('system_categories').where({ id: req.params.id }).del();
    res.json({ success: true });
  } catch (err) { next(err); }
};
