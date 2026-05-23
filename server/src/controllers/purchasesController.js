import db from '../config/database.js';

export const list = async (req, res, next) => {
  try {
    const { status, keyword } = req.query;

    let query = db('purchase_orders')
      .join('users', 'purchase_orders.created_by', 'users.id')
      .leftJoin('purchase_order_items', 'purchase_orders.id', 'purchase_order_items.purchase_order_id')
      .leftJoin('work_orders', 'purchase_orders.work_order_id', 'work_orders.id')
      .select(
        'purchase_orders.id',
        'purchase_orders.order_no',
        'purchase_orders.status',
        'purchase_orders.priority',
        'purchase_orders.remark',
        'purchase_orders.work_order_id',
        'users.username as created_by_name',
        'purchase_orders.created_at',
        'purchase_orders.updated_at',
        db.raw('COUNT(purchase_order_items.id) as item_count'),
        db.raw('COALESCE(SUM(purchase_order_items.quantity), 0) as total_quantity'),
        db.raw('COALESCE(SUM(purchase_order_items.total_price), 0) as total_amount'),
        'work_orders.order_no as work_order_no'
      )
      .groupBy('purchase_orders.id', 'users.id', 'purchase_orders.order_no', 'purchase_orders.status', 'purchase_orders.priority', 'purchase_orders.remark', 'purchase_orders.work_order_id', 'purchase_orders.created_at', 'purchase_orders.updated_at', 'work_orders.order_no')
      .orderBy('purchase_orders.created_at', 'desc');

    if (status) {
      query = query.where('purchase_orders.status', status);
    }
    if (keyword) {
      query = query.where('purchase_orders.order_no', 'ilike', `%${keyword}%`);
    }

    const rows = await query;

    // Fetch actual items for all purchase orders
    if (rows.length > 0) {
      const ids = rows.map(r => r.id);

      const orderItems = await db('purchase_order_items')
        .leftJoin('parts', 'purchase_order_items.part_id', 'parts.id')
        .leftJoin('tools', 'purchase_order_items.tool_id', 'tools.id')
        .select(
          'purchase_order_items.purchase_order_id',
          'purchase_order_items.item_type',
          'purchase_order_items.quantity',
          'purchase_order_items.unit_price',
          'purchase_order_items.total_price',
          'parts.name as part_name',
          'parts.code as part_code',
          'tools.name as tool_name',
          'tools.code as tool_code',
        )
        .whereIn('purchase_order_items.purchase_order_id', ids);

      // Group items by purchase_order_id
      const itemsByOrder = {};
      for (const item of orderItems) {
        if (!itemsByOrder[item.purchase_order_id]) {
          itemsByOrder[item.purchase_order_id] = [];
        }
        itemsByOrder[item.purchase_order_id].push({
          item_type: item.item_type,
          name: item.item_type === 'tool' ? item.tool_name : item.part_name,
          code: item.item_type === 'tool' ? item.tool_code : item.part_code,
          quantity: Number(item.quantity),
          unit_price: item.unit_price ? Number(item.unit_price) : null,
          total_price: item.total_price ? Number(item.total_price) : null,
        });
      }

      const result = rows.map(item => ({
        ...item,
        item_count: Number(item.item_count),
        total_quantity: Number(item.total_quantity),
        total_amount: Number(item.total_amount) || 0,
        items: itemsByOrder[item.id] || [],
      }));

      return res.json(result);
    }

    const items = rows.map(item => ({
      ...item,
      item_count: Number(item.item_count),
      total_quantity: Number(item.total_quantity),
      total_amount: Number(item.total_amount) || 0,
      items: [],
    }));

    res.json(items);
  } catch (err) { next(err); }
};

export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await db('purchase_orders')
      .join('users', 'purchase_orders.created_by', 'users.id')
      .leftJoin('work_orders', 'purchase_orders.work_order_id', 'work_orders.id')
      .select(
        'purchase_orders.id',
        'purchase_orders.order_no',
        'purchase_orders.status',
        'purchase_orders.priority',
        'purchase_orders.remark',
        'purchase_orders.work_order_id',
        'users.username as created_by_name',
        'purchase_orders.created_at',
        'purchase_orders.updated_at',
        'work_orders.order_no as work_order_no',
        'work_orders.fault_description as work_order_fault'
      )
      .where('purchase_orders.id', id)
      .first();

    if (!order) {
      return res.status(404).json({ error: '采购单不存在' });
    }

    const statusText = {
      pending: '待采购',
      ordered: '已采购',
      partial_arrived: '部分到货',
      completed: '已完成',
    };

    const items = await db('purchase_order_items')
      .leftJoin('parts', 'purchase_order_items.part_id', 'parts.id')
      .leftJoin('tools', 'purchase_order_items.tool_id', 'tools.id')
      .select(
        'purchase_order_items.id',
        'purchase_order_items.item_type',
        'purchase_order_items.part_id',
        'purchase_order_items.tool_id',
        'purchase_order_items.quantity',
        'purchase_order_items.arrived_quantity',
        'purchase_order_items.unit_price',
        'purchase_order_items.total_price',
        'parts.name as part_name',
        'parts.code as part_code',
        'parts.model as part_model',
        'parts.unit',
        'tools.name as tool_name',
        'tools.code as tool_code',
        'tools.model as tool_model',
      )
      .where('purchase_order_items.purchase_order_id', id);

    res.json({
      ...order,
      status_text: statusText[order.status] || order.status,
      statusText: statusText[order.status] || order.status,
      total_amount: items.reduce((sum, item) => sum + Number(item.total_price || 0), 0),
      items: items.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        arrived_quantity: Number(item.arrived_quantity),
        unit_price: item.unit_price ? Number(item.unit_price) : null,
        total_price: item.total_price ? Number(item.total_price) : null,
      })),
    });
  } catch (err) { next(err); }
};

export const create = async (req, res, next) => {
  try {
    const { work_order_id, priority, remark, items } = req.body;
    const created_by = req.user.id;

    const today = new Date();
    const yyyy = today.getFullYear().toString();
    const mm = (today.getMonth() + 1).toString().padStart(2, '0');
    const dd = today.getDate().toString().padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;

    const todayPrefix = `PO${dateStr}`;

    const lastOrder = await db('purchase_orders')
      .where('order_no', 'like', `${todayPrefix}%`)
      .orderBy('order_no', 'desc')
      .first();

    let seq = 1;
    if (lastOrder) {
      const lastSeq = parseInt(lastOrder.order_no.slice(-3), 10);
      seq = lastSeq + 1;
    }
    const orderNo = `PO${dateStr}${seq.toString().padStart(3, '0')}`;

    const result = await db.transaction(async trx => {
      const insertResult = await trx('purchase_orders').insert({
        order_no: orderNo,
        priority: priority || 'normal',
        work_order_id: work_order_id || null,
        remark: remark || null,
        created_by,
      }).returning('id');
      const orderId = insertResult?.[0]?.id ?? insertResult?.id ?? insertResult;

      if (items && items.length > 0) {
        const orderItems = items.map(item => {
          const quantity = Number(item.quantity) || 0;
          const unitPrice = Number(item.unit_price) || 0;
          return {
            purchase_order_id: orderId,
            item_type: item.item_type || 'part',
            part_id: item.item_type === 'tool' ? null : item.part_id,
            tool_id: item.item_type === 'tool' ? item.tool_id : null,
            quantity,
            unit_price: unitPrice || null,
            total_price: unitPrice > 0 ? +(quantity * unitPrice).toFixed(2) : null,
          };
        });
        await trx('purchase_order_items').insert(orderItems);

        // Update total_amount on purchase_orders
        const totalAmount = orderItems.reduce((sum, i) => sum + (i.total_price || 0), 0);
        await trx('purchase_orders').where('id', orderId).update({
          total_amount: totalAmount > 0 ? totalAmount : null,
        });
      }

      return orderId;
    });

    res.status(201).json({ id: result });
  } catch (err) { next(err); }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { work_order_id, priority, remark, items } = req.body;

    const existing = await db('purchase_orders').where('id', id).first();
    if (!existing) {
      return res.status(404).json({ error: '采购单不存在' });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({ error: '仅允许修改待采购状态的采购单' });
    }

    await db.transaction(async trx => {
      const updateData = {};
      if (work_order_id !== undefined) updateData.work_order_id = work_order_id;
      if (priority !== undefined) updateData.priority = priority;
      if (remark !== undefined) updateData.remark = remark;

      if (Object.keys(updateData).length > 0) {
        await trx('purchase_orders').where('id', id).update(updateData);
      }

      if (items && items.length > 0) {
        await trx('purchase_order_items').where('purchase_order_id', id).del();

        const orderItems = items.map(item => {
          const quantity = Number(item.quantity) || 0;
          const unitPrice = Number(item.unit_price) || 0;
          return {
            purchase_order_id: id,
            item_type: item.item_type || 'part',
            part_id: item.item_type === 'tool' ? null : item.part_id,
            tool_id: item.item_type === 'tool' ? item.tool_id : null,
            quantity,
            unit_price: unitPrice || null,
            total_price: unitPrice > 0 ? +(quantity * unitPrice).toFixed(2) : null,
          };
        });
        await trx('purchase_order_items').insert(orderItems);

        // Update total_amount on purchase_orders
        const totalAmount = orderItems.reduce((sum, i) => sum + (i.total_price || 0), 0);
        await trx('purchase_orders').where('id', id).update({
          total_amount: totalAmount > 0 ? totalAmount : null,
        });
      }
    });

    res.json({ success: true });
  } catch (err) { next(err); }
};


export const updateItem = async (req, res, next) => {
  try {
    const { id, itemId } = req.params;
    const { quantity } = req.body;
    const order = await db('purchase_orders').where('id', id).first();
    if (!order) return res.status(404).json({ error: '采购单不存在' });
    if (order.status === 'completed') return res.status(400).json({ error: '已完成采购单不可修改' });
    const item = await db('purchase_order_items').where('id', itemId).where('purchase_order_id', id).first();
    if (!item) return res.status(404).json({ error: '采购项不存在' });
    const arrived = Number(item.arrived_quantity) || 0;
    const newQty = Number(quantity) || 0;
    if (arrived > 0 && newQty < arrived) {
      return res.status(400).json({ error: '已到货 ' + arrived + '，数量不能少于已到货数量' });
    }
    const unitPrice = Number(item.unit_price) || 0;
    const totalPrice = unitPrice > 0 ? +((newQty * unitPrice).toFixed(2)) : null;
    await db('purchase_order_items').where('id', itemId).update({ quantity: newQty, total_price: totalPrice });
    const allItems = await db('purchase_order_items').where('purchase_order_id', id);
    const orderTotal = allItems.reduce((sum, i) => sum + (Number(i.total_price) || 0), 0);
    await db('purchase_orders').where('id', id).update({ total_amount: orderTotal > 0 ? orderTotal : null });
    res.json({ success: true, quantity: newQty, total_price: totalPrice });
  } catch (err) { next(err); }
};

export const arrival = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items: arrivalItems } = req.body;
    const created_by = req.user.id;

    const order = await db('purchase_orders').where('id', id).first();
    if (!order) {
      return res.status(404).json({ error: '采购单不存在' });
    }

    const result = await db.transaction(async trx => {
      for (const item of arrivalItems) {
        const { item_id, arrived_quantity, location_id } = item;

        const orderItem = await trx('purchase_order_items')
          .where('id', item_id)
          .where('purchase_order_id', id)
          .first();

        if (!orderItem) continue;

        await trx('purchase_order_items')
          .where('id', item_id)
          .increment('arrived_quantity', arrived_quantity);

        // Only create inbound/stock records for parts, not tools
        if (orderItem.item_type !== 'tool' && orderItem.part_id) {
          await trx('inbound_records').insert({
            part_id: orderItem.part_id,
            quantity: arrived_quantity,
            location_id,
            purchase_order_id: id,
            created_by,
          });

          const existing = await trx('stock_records')
            .where({ part_id: orderItem.part_id, location_id })
            .first();

          if (existing) {
            await trx('stock_records')
              .where({ part_id: orderItem.part_id, location_id })
              .increment('quantity', arrived_quantity);
          } else {
            await trx('stock_records').insert({
              part_id: orderItem.part_id,
              location_id,
              quantity: arrived_quantity,
            });
          }
        }
      }

      const updatedItems = await trx('purchase_order_items')
        .where('purchase_order_id', id);

      const allCompleted = updatedItems.every(
        item => Number(item.arrived_quantity) >= Number(item.quantity)
      );
      const someArrived = updatedItems.some(
        item => Number(item.arrived_quantity) > 0
      );

      const newStatus = allCompleted ? 'completed' : 'partial_arrived';

      await trx('purchase_orders').where('id', id).update({ status: newStatus });

      return newStatus;
    });

    res.json({ success: true, status: result });
  } catch (err) { next(err); }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db('purchase_order_items').where({ purchase_order_id: id }).del();
    await db('purchase_orders').where({ id }).del();
    res.json({ success: true });
  } catch (err) { next(err); }
};
