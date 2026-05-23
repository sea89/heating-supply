import db from '../config/database.js';

export const list = async (req, res, next) => {
  try {
    const { keyword, status } = req.query;
    let query = db('tools');

    if (keyword) {
      query = query.where(function () {
        this.where('tools.name', 'ilike', `%${keyword}%`)
          .orWhere('tools.code', 'ilike', `%${keyword}%`)
          .orWhere('tools.model', 'ilike', `%${keyword}%`);
      });
    }
    if (status) {
      query = query.where('tools.status', status);
    }

    const items = await query.orderBy('tools.code');

    // Batch fetch current borrowers for all borrowed tools (avoid N+1)
    const borrowedIds = items.filter(i => i.status === 'borrowed').map(i => i.id);
    const borrowerMap = {};
    if (borrowedIds.length > 0) {
      const borrows = await db('tool_borrows')
        .leftJoin('users', 'tool_borrows.borrower_user_id', 'users.id')
        .whereIn('tool_borrows.tool_id', borrowedIds)
        .whereNull('tool_borrows.returned_at')
        .select(
          'tool_borrows.tool_id',
          'tool_borrows.external_borrower_name',
          'users.name as borrower_name'
        );
      for (const b of borrows) {
        borrowerMap[b.tool_id] = b.borrower_name || b.external_borrower_name || null;
      }
    }

    for (const item of items) {
      item.current_borrower = borrowerMap[item.id] || null;
    }

    res.json(items);
  } catch (err) { next(err); }
};

export const getById = async (req, res, next) => {
  try {
    const item = await db('tools').where({ id: req.params.id }).first();
    if (!item) return res.status(404).json({ error: '工具不存在' });

    const borrow_history = await db('tool_borrows')
      .leftJoin('users', 'tool_borrows.borrower_user_id', 'users.id')
      .where('tool_borrows.tool_id', item.id)
      .orderBy('tool_borrows.borrowed_at', 'desc')
      .select(
        'tool_borrows.*',
        'users.name as borrower_name'
      );

    item.borrow_history = borrow_history;
    res.json(item);
  } catch (err) { next(err); }
};

export const create = async (req, res, next) => {
  try {
    const { code, name, model, category, location, unit_price, quantity } = req.body;
    const insertResult = await db('tools').insert({ code, name, model, category, location, unit_price: unit_price || null, quantity: quantity || 1 }).returning('id');
    const id = insertResult?.[0]?.id ?? insertResult?.id ?? insertResult;
    res.status(201).json({ id });
  } catch (err) { next(err); }
};

export const update = async (req, res, next) => {
  try {
    const existing = await db('tools').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: '工具不存在' });

    await db('tools').where({ id: req.params.id }).update(req.body);
    res.json({ success: true });
  } catch (err) { next(err); }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await db('tools').where({ id }).first();
    if (!existing) return res.status(404).json({ error: '工具不存在' });

    // Check for active borrows before deletion
    const [{ count }] = await db('tool_borrows').where({ tool_id: id }).whereNull('returned_at').count('* as count');
    if (Number(count) > 0) {
      return res.status(400).json({ error: '该工具存在未归还的借用记录，无法删除' });
    }

    await db('tools').where({ id }).del();
    res.json({ success: true });
  } catch (err) { next(err); }
};

export const borrow = async (req, res, next) => {
  try {
    const {
      tool_ids,
      borrower_user_id,
      external_borrower_name,
      external_borrower_phone,
      external_borrower_company,
      borrowed_at,
      expected_return_at,
      purpose
    } = req.body;

    if (!Array.isArray(tool_ids) || tool_ids.length === 0) {
      return res.status(400).json({ error: '请选择要借用的工具' });
    }
    if (!borrower_user_id && !external_borrower_name) {
      return res.status(400).json({ error: '请指定借用人' });
    }

    const tools = await db('tools').whereIn('id', tool_ids).select('id', 'code', 'name', 'status');

    const unavailableTools = tools.filter(t => t.status !== 'available');
    if (unavailableTools.length > 0) {
      const names = unavailableTools.map(t => `${t.code}(${t.status})`).join('、');
      return res.status(400).json({ error: `以下工具不可借用：${names}` });
    }

    const borrowRecords = tool_ids.map(tool_id => ({
      tool_id,
      borrower_user_id: borrower_user_id || null,
      external_borrower_name: external_borrower_name || null,
      external_borrower_phone: external_borrower_phone || null,
      external_borrower_company: external_borrower_company || null,
      borrowed_at: borrowed_at || undefined,
      expected_return_at: expected_return_at || null,
      purpose: purpose || null
    }));

    await db.transaction(async trx => {
      await trx('tool_borrows').insert(borrowRecords);
      await trx('tools').whereIn('id', tool_ids).update({ status: 'borrowed' });
    });

    res.status(201).json({ success: true });
  } catch (err) { next(err); }
};

export const returnTool = async (req, res, next) => {
  try {
    const { damage_note, returned_at } = req.body;

    const borrow = await db('tool_borrows')
      .where('tool_id', req.params.id)
      .whereNull('returned_at')
      .orderBy('borrowed_at', 'desc')
      .first();

    if (!borrow) {
      return res.status(400).json({ error: '该工具没有被借用或已归还' });
    }

    const newStatus = damage_note ? 'maintenance' : 'available';

    await db.transaction(async trx => {
      await trx('tool_borrows').where({ id: borrow.id }).update({
        returned_at: returned_at || db.fn.now(),
        damage_note: damage_note || null
      });
      await trx('tools').where({ id: req.params.id }).update({ status: newStatus });
    });

    res.json({ success: true, tool_status: newStatus });
  } catch (err) { next(err); }
};

export const listBorrows = async (req, res, next) => {
  try {
    const { returned } = req.query;
    let query = db('tool_borrows')
      .leftJoin('tools', 'tool_borrows.tool_id', 'tools.id')
      .leftJoin('users', 'tool_borrows.borrower_user_id', 'users.id')
      .select(
        'tool_borrows.*',
        'tools.name as tool_name',
        'tools.code as tool_code',
        'users.name as borrower_name'
      );

    if (returned === 'true') {
      query = query.whereNotNull('tool_borrows.returned_at');
    } else if (returned === 'false') {
      query = query.whereNull('tool_borrows.returned_at');
    }

    const items = await query.orderBy('tool_borrows.borrowed_at', 'desc');
    res.json(items);
  } catch (err) { next(err); }
};


