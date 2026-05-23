import db from '../config/database.js';

export const overview = async (req, res, next) => {
  try {
    // Count parts with stock > 0
    const [{ count: total_parts }] = await db('stock_records')
      .where('quantity', '>', 0)
      .count('* as count');

    // Count low-stock parts — use raw SQL to avoid knex wrapping issues
    const alertResult = await db.raw(`
      SELECT COUNT(*) as count FROM parts p
      WHERE p.min_stock > 0
      AND COALESCE((
        SELECT SUM(quantity) FROM stock_records WHERE part_id = p.id
      ), 0) <= p.min_stock
    `);
    const alert_count = parseInt(alertResult.rows?.[0]?.count || '0', 10);

    const [{ count: today_inbound }] = await db('inbound_records')
      .where(db.raw('created_at::date = CURRENT_DATE'))
      .count('* as count');

    const [{ count: today_outbound }] = await db('outbound_records')
      .where(db.raw('created_at::date = CURRENT_DATE'))
      .count('* as count');

    res.json({
      total_parts: Number(total_parts),
      alert_count: Number(alert_count),
      today_inbound: Number(today_inbound),
      today_outbound: Number(today_outbound),
    });
  } catch (err) { next(err); }
};

export const stock = async (req, res, next) => {
  try {
    const { part_id, location_id } = req.query;

    let query = db('stock_records')
      .join('parts', 'stock_records.part_id', 'parts.id')
      .join('locations', 'stock_records.location_id', 'locations.id')
      .select(
        'stock_records.id',
        'stock_records.part_id',
        'stock_records.location_id',
        'parts.code as part_code',
        'parts.name as part_name',
        'parts.model as part_model',
        'parts.unit',
        'locations.warehouse',
        'locations.shelf',
        'locations.bin',
        'stock_records.quantity',
        'parts.min_stock'
      )
      .orderBy(['parts.code', 'locations.warehouse', 'locations.shelf', 'locations.bin']);

    if (part_id) {
      query = query.where('stock_records.part_id', part_id);
    }
    if (location_id) {
      query = query.where('stock_records.location_id', location_id);
    }

    const rows = await query;

    const items = rows.map(item => ({
      ...item,
      quantity: Number(item.quantity),
      stock_status: Number(item.quantity) <= Number(item.min_stock) ? 'low' : 'normal',
    }));

    res.json(items);
  } catch (err) { next(err); }
};

export const inbound = async (req, res, next) => {
  try {
    const { items } = req.body;
    const created_by = req.user.id;
    const ids = [];

    await db.transaction(async trx => {
      for (const item of items) {
        const { part_id, quantity, location_id, supplier_id, purchase_order_id, remark } = item;

        const insertResult = await trx('inbound_records')
          .insert({
            part_id,
            quantity,
            location_id,
            supplier_id: supplier_id || null,
            purchase_order_id: purchase_order_id || null,
            created_by,
            remark: remark || null,
          })
          .returning('id');
        const id = insertResult?.[0]?.id ?? insertResult?.id ?? insertResult;
        ids.push(id);

        const existing = await trx('stock_records')
          .where({ part_id, location_id })
          .first();

        if (existing) {
          await trx('stock_records')
            .where({ part_id, location_id })
            .increment('quantity', quantity);
        } else {
          await trx('stock_records').insert({ part_id, location_id, quantity });
        }
      }
    });

    res.status(201).json({ ids });
  } catch (err) { next(err); }
};

export const outbound = async (req, res, next) => {
  try {
    const { items } = req.body;
    const created_by = req.user.id;

    await db.transaction(async trx => {
      for (const item of items) {
        const { part_id, quantity, location_id, recipient, work_order_id, remark } = item;

        const part = await trx('parts').select('name', 'code').where({ id: part_id }).first();

        const stock = await trx('stock_records')
          .where({ part_id, location_id })
          .first();

        const available = stock ? Number(stock.quantity) : 0;
        if (available < quantity) {
          const partName = part ? `${part.name}（${part.code}）` : `备件#${part_id}`;
          throw new Error(`库存不足：${partName} 在所选库位可用库存仅 ${available}，出库需求 ${quantity}`);
        }

        await trx('outbound_records').insert({
          part_id,
          quantity,
          location_id,
          recipient: recipient || null,
          work_order_id: work_order_id || null,
          created_by,
          remark: remark || null,
        });

        await trx('stock_records')
          .where({ part_id, location_id })
          .decrement('quantity', quantity);
      }
    });

    res.status(201).json({ success: true });
  } catch (err) {
    if (err.message && err.message.startsWith('库存不足:')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
};

export const adjustStock = async (req, res, next) => {
  try {
    const { part_id, location_id, quantity } = req.body;

    const existing = await db('stock_records')
      .where({ part_id, location_id })
      .first();

    if (existing) {
      await db('stock_records')
        .where({ part_id, location_id })
        .update({ quantity });
    } else {
      await db('stock_records').insert({ part_id, location_id, quantity });
    }

    res.json({ success: true, quantity });
  } catch (err) { next(err); }
};

export const transactions = async (req, res, next) => {
  try {
    const { type, start_date, end_date, page = 1, page_size = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.max(1, parseInt(page_size, 10) || 20);
    const offset = (pageNum - 1) * limit;

    let inboundQuery = db('inbound_records')
      .join('parts', 'inbound_records.part_id', 'parts.id')
      .join('locations', 'inbound_records.location_id', 'locations.id')
      .leftJoin('suppliers', 'inbound_records.supplier_id', 'suppliers.id')
      .leftJoin('users', 'inbound_records.created_by', 'users.id')
      .select(
        'inbound_records.id',
        db.raw("'inbound' as type"),
        'parts.name as part_name',
        'parts.code as part_code',
        'inbound_records.quantity',
        'locations.warehouse',
        'locations.shelf',
        'locations.bin',
        'suppliers.name as supplier_name',
        'inbound_records.purchase_order_id',
        'users.username as created_by_name',
        'inbound_records.remark',
        'inbound_records.created_at'
      );

    let outboundQuery = db('outbound_records')
      .join('parts', 'outbound_records.part_id', 'parts.id')
      .join('locations', 'outbound_records.location_id', 'locations.id')
      .leftJoin('users', 'outbound_records.created_by', 'users.id')
      .select(
        'outbound_records.id',
        db.raw("'outbound' as type"),
        'parts.name as part_name',
        'parts.code as part_code',
        'outbound_records.quantity',
        'locations.warehouse',
        'locations.shelf',
        'locations.bin',
        db.raw('NULL as supplier_name'),
        db.raw('NULL as purchase_order_id'),
        'outbound_records.recipient',
        'users.username as created_by_name',
        'outbound_records.remark',
        'outbound_records.created_at'
      );

    if (start_date) {
      inboundQuery = inboundQuery.where(db.raw('inbound_records.created_at::date >= ?', [start_date]));
      outboundQuery = outboundQuery.where(db.raw('outbound_records.created_at::date >= ?', [start_date]));
    }
    if (end_date) {
      inboundQuery = inboundQuery.where(db.raw('inbound_records.created_at::date <= ?', [end_date]));
      outboundQuery = outboundQuery.where(db.raw('outbound_records.created_at::date <= ?', [end_date]));
    }

    let rows;
    if (type === 'inbound') {
      rows = await inboundQuery.orderBy('inbound_records.created_at', 'desc');
    } else if (type === 'outbound') {
      rows = await outboundQuery.orderBy('outbound_records.created_at', 'desc');
    } else {
      const [inboundRows, outboundRows] = await Promise.all([
        inboundQuery,
        outboundQuery,
      ]);

      rows = [...inboundRows, ...outboundRows].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
    }

    const total = rows.length;
    const items = rows.slice(offset, offset + limit).map(item => ({
      ...item,
      quantity: Number(item.quantity),
    }));

    res.json({ items, total, page: pageNum, page_size: limit });
  } catch (err) { next(err); }
};



export const deleteStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const record = await db('stock_records').where({ id }).first();
    if (!record) return res.status(404).json({ error: '\u5e93\u5b58\u8bb0\u5f55\u4e0d\u5b58\u5728' });
    await db('stock_records').where({ id }).del();
    res.json({ success: true });
  } catch (err) { next(err); }
};