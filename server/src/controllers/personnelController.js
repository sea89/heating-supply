import db from '../config/database.js';

export const list = async (req, res, next) => {
  try {
    const { keyword, status } = req.query;
    let query = db('personnel').orderBy('name');

    if (keyword) {
      query = query.where(function () {
        this.where('name', 'ilike', `%${keyword}%`)
          .orWhere('phone', 'ilike', `%${keyword}%`);
      });
    }

    if (status && status !== 'all') {
      query = query.where({ status });
    }

    const items = await query;
    res.json(items);
  } catch (err) { next(err); }
};

export const getById = async (req, res, next) => {
  try {
    const item = await db('personnel').where({ id: req.params.id }).first();
    if (!item) return res.status(404).json({ error: '人员不存在' });
    res.json(item);
  } catch (err) { next(err); }
};

export const create = async (req, res, next) => {
  try {
    const { name, phone, position, hire_date, notes } = req.body;
    const insertResult = await db('personnel').insert({ name, phone, position, hire_date, notes }).returning('id');
    const id = insertResult?.[0]?.id ?? insertResult?.id ?? insertResult;
    res.status(201).json({ id });
  } catch (err) { next(err); }
};

export const update = async (req, res, next) => {
  try {
    const existing = await db('personnel').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: '人员不存在' });

    const { name, phone, position, hire_date, status, resignation_date, notes } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (position !== undefined) updateData.position = position;
    if (hire_date !== undefined) updateData.hire_date = hire_date;
    if (status !== undefined) updateData.status = status;
    if (resignation_date !== undefined) updateData.resignation_date = resignation_date;
    if (notes !== undefined) updateData.notes = notes;

    if (Object.keys(updateData).length) {
      await db('personnel').where({ id: req.params.id }).update(updateData);
    }

    // 如果状态变为离职，关联的用户账号设为禁用
    if (status === 'resigned' && existing.status !== 'resigned') {
      await db('users').where({ personnel_id: req.params.id }).update({ is_active: false });
    }

    // 如果状态变为在职，关联的用户账号设为启用
    if (status === 'active' && existing.status !== 'active') {
      await db('users').where({ personnel_id: req.params.id }).update({ is_active: true });
    }

    res.json({ success: true });
  } catch (err) { next(err); }
};

export const remove = async (req, res, next) => {
  try {
    const existing = await db('personnel').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: '人员不存在' });

    const linkedUser = await db('users').where({ personnel_id: req.params.id }).first();
    if (linkedUser) {
      return res.status(400).json({ error: '该人员关联了系统账号，无法删除。请先解除关联' });
    }

    await db('personnel').where({ id: req.params.id }).del();
    res.json({ success: true });
  } catch (err) { next(err); }
};
