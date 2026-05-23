import db from '../config/database.js';

export const getAllOptions = async (req, res, next) => {
  try {
    const [parts, locations, suppliers, categories, systemCategories, equipment] = await Promise.all([
      db('parts').select('id', 'code', 'name', 'model', 'unit', 'unit_price').orderBy('code'),
      db('locations').select('id', 'warehouse', 'shelf', 'bin').orderBy('warehouse').orderBy('shelf').orderBy('bin'),
      db('suppliers').select('id', 'name').orderBy('name'),
      db('part_categories').select('id', 'name', 'parent_id').orderBy('name'),
      db('system_categories').select('id', 'name').orderBy('name'),
      db('equipment').select('id', 'code', 'name', 'model').orderBy('code'),
    ]);

    res.json({ parts, locations, suppliers, categories, systemCategories, equipment });
  } catch (err) { next(err); }
};