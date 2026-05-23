import db from '../config/database.js';

export const list = async (req, res, next) => {
  try {
    const { status, keyword } = req.query;

    let query = db('work_orders')
      .join('equipment', 'work_orders.equipment_id', 'equipment.id')
      .leftJoin('users', 'work_orders.assignee_id', 'users.id')
      .leftJoin('work_order_parts', 'work_orders.id', 'work_order_parts.work_order_id')
      .select(
        'work_orders.id',
        'work_orders.order_no',
        'work_orders.equipment_id',
        'work_orders.fault_description',
        'work_orders.assignee_id',
        'work_orders.status',
        'work_orders.completion_note',
        'work_orders.completed_at',
        'work_orders.created_at',
        'work_orders.updated_at',
        'equipment.name as equipment_name',
        'users.name as assignee_name',
        db.raw('COUNT(work_order_parts.id) as part_count')
      )
      .groupBy(
        'work_orders.id',
        'equipment.name',
        'users.name',
        'work_orders.order_no',
        'work_orders.equipment_id',
        'work_orders.fault_description',
        'work_orders.assignee_id',
        'work_orders.status',
        'work_orders.completion_note',
        'work_orders.completed_at',
        'work_orders.created_at',
        'work_orders.updated_at'
      )
      .orderBy('work_orders.created_at', 'desc');

    if (status) {
      query = query.where('work_orders.status', status);
    }
    if (keyword) {
      query = query.where(function () {
        this.where('work_orders.order_no', 'ilike', `%${keyword}%`)
          .orWhere('work_orders.fault_description', 'ilike', `%${keyword}%`);
      });
    }

    const rows = await query;

    const items = rows.map(item => ({
      ...item,
      part_count: Number(item.part_count),
    }));

    // Compute process_status for each work order
    if (items.length > 0) {
      const ids = items.map(i => i.id);

      const [poStatuses, outboundCounts] = await Promise.all([
        // Get purchase order statuses per work order
        db('purchase_orders')
          .select('work_order_id')
          .select(db.raw("string_agg(status, ',' order by status) as statuses"))
          .whereIn('work_order_id', ids)
          .whereNotNull('work_order_id')
          .groupBy('work_order_id'),
        // Get outbound record counts per work order
        db('outbound_records')
          .select('work_order_id')
          .count('* as outbound_count')
          .whereIn('work_order_id', ids)
          .whereNotNull('work_order_id')
          .groupBy('work_order_id'),
      ]);

      const poMap = {};
      for (const row of poStatuses) {
        poMap[row.work_order_id] = row.statuses.split(',');
      }
      const outboundMap = {};
      for (const row of outboundCounts) {
        outboundMap[row.work_order_id] = Number(row.outbound_count);
      }

      for (const item of items) {
        if (item.status === 'completed') {
          item.process_status = '已完成';
          continue;
        }

        const poStatusList = poMap[item.id] || [];
        const hasOutbound = outboundMap[item.id] > 0;

        if (hasOutbound && item.status === 'in_progress') {
          item.process_status = '进行中';
        } else if (hasOutbound) {
          item.process_status = '进行中';
        } else if (poStatusList.length > 0) {
          const hasPending = poStatusList.some(s => s === 'pending' || s === 'ordered');
          const allArrived = poStatusList.every(s => s === 'partial_arrived' || s === 'completed');
          const hasCompleted = poStatusList.some(s => s === 'completed' || s === 'partial_arrived');
          if (allArrived && hasCompleted) {
            item.process_status = '已入库待出库';
          } else if (hasPending) {
            item.process_status = '采购中';
          } else {
            item.process_status = '已入库待出库';
          }
        } else if (item.part_count > 0) {
          item.process_status = '待采购';
        } else {
          item.process_status = item.status === 'in_progress' ? '进行中' : '待处理';
        }
      }
    }

    res.json(items);
  } catch (err) { next(err); }
};

export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await db('work_orders')
      .join('equipment', 'work_orders.equipment_id', 'equipment.id')
      .leftJoin('users', 'work_orders.assignee_id', 'users.id')
      .select(
        'work_orders.id',
        'work_orders.order_no',
        'work_orders.equipment_id',
        'work_orders.fault_description',
        'work_orders.assignee_id',
        'work_orders.status',
        'work_orders.completion_note',
        'work_orders.completed_at',
        'work_orders.created_at',
        'work_orders.updated_at',
        'equipment.name as equipment_name',
        'equipment.code as equipment_code',
        'equipment.model as equipment_model',
        'users.name as assignee_name'
      )
      .where('work_orders.id', id)
      .first();

    if (!order) {
      return res.status(404).json({ error: '工单不存在' });
    }

    const parts = await db('work_order_parts')
      .join('parts', 'work_order_parts.part_id', 'parts.id')
      .select(
        'work_order_parts.id',
        'work_order_parts.part_id',
        'work_order_parts.quantity',
        'parts.name as part_name',
        'parts.code as part_code',
        'parts.model as part_model',
        'parts.unit'
      )
      .where('work_order_parts.work_order_id', id);

    const outboundRecords = await db('outbound_records')
      .join('parts', 'outbound_records.part_id', 'parts.id')
      .join('locations', 'outbound_records.location_id', 'locations.id')
      .leftJoin('users', 'outbound_records.created_by', 'users.id')
      .select(
        'outbound_records.id',
        'outbound_records.part_id',
        'outbound_records.quantity',
        'outbound_records.recipient',
        'outbound_records.remark',
        'outbound_records.created_at',
        'parts.name as part_name',
        'parts.code as part_code',
        'locations.warehouse',
        'locations.shelf',
        'locations.bin',
        'users.username as created_by_name'
      )
      .where('outbound_records.work_order_id', id)
      .orderBy('outbound_records.created_at', 'desc');

    const purchaseOrders = await db('purchase_orders')
      .select(
        'id',
        'order_no',
        'status',
        'priority',
        'created_at'
      )
      .where('work_order_id', id)
      .orderBy('created_at', 'desc');

    res.json({
      ...order,
      parts: parts.map(p => ({ ...p, quantity: Number(p.quantity) })),
      outbound_records: outboundRecords.map(r => ({ ...r, quantity: Number(r.quantity) })),
      purchase_orders: purchaseOrders,
    });
  } catch (err) { next(err); }
};

export const create = async (req, res, next) => {
  try {
    const { equipment_id, fault_description, assignee_id, parts } = req.body;

    const today = new Date();
    const yyyy = today.getFullYear().toString();
    const mm = (today.getMonth() + 1).toString().padStart(2, '0');
    const dd = today.getDate().toString().padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;

    const todayPrefix = `WO${dateStr}`;

    const lastOrder = await db('work_orders')
      .where('order_no', 'like', `${todayPrefix}%`)
      .orderBy('order_no', 'desc')
      .first();

    let seq = 1;
    if (lastOrder) {
      const lastSeq = parseInt(lastOrder.order_no.slice(-3), 10);
      seq = lastSeq + 1;
    }
    const orderNo = `WO${dateStr}${seq.toString().padStart(3, '0')}`;

    const result = await db.transaction(async trx => {
      const insertResult = await trx('work_orders').insert({
        order_no: orderNo,
        equipment_id,
        fault_description,
        assignee_id: assignee_id || null,
      }).returning('id');
      const orderId = insertResult?.[0]?.id ?? insertResult?.id ?? insertResult;

      if (parts && parts.length > 0) {
        const orderParts = parts.map(item => ({
          work_order_id: orderId,
          part_id: item.part_id,
          quantity: item.quantity,
        }));
        await trx('work_order_parts').insert(orderParts);
      }

      return orderId;
    });

    res.status(201).json({ id: result });
  } catch (err) { next(err); }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { equipment_id, fault_description, assignee_id, parts } = req.body;

    const existing = await db('work_orders').where('id', id).first();
    if (!existing) {
      return res.status(404).json({ error: '工单不存在' });
    }

    await db.transaction(async trx => {
      const updateData = {};
      if (equipment_id !== undefined) updateData.equipment_id = equipment_id;
      if (fault_description !== undefined) updateData.fault_description = fault_description;
      if (assignee_id !== undefined) updateData.assignee_id = assignee_id;

      if (Object.keys(updateData).length > 0) {
        await trx('work_orders').where('id', id).update(updateData);
      }

      if (parts && parts.length > 0) {
        await trx('work_order_parts').where('work_order_id', id).del();

        const orderParts = parts.map(item => ({
          work_order_id: id,
          part_id: item.part_id,
          quantity: item.quantity,
        }));
        await trx('work_order_parts').insert(orderParts);
      }
    });

    res.json({ success: true });
  } catch (err) { next(err); }
};

export const complete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { completion_note } = req.body;

    const existing = await db('work_orders').where('id', id).first();
    if (!existing) {
      return res.status(404).json({ error: '工单不存在' });
    }

    await db('work_orders').where('id', id).update({
      status: 'completed',
      completed_at: new Date(),
      completion_note: completion_note || null,
    });

    res.json({ success: true });
  } catch (err) { next(err); }
};

export const stockCheck = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 验证工单存在
    const order = await db('work_orders').where('id', id).first();
    if (!order) {
      return res.status(404).json({ error: '工单不存在' });
    }

    // 获取工单所需备件
    const requiredParts = await db('work_order_parts')
      .join('parts', 'work_order_parts.part_id', 'parts.id')
      .select(
        'work_order_parts.part_id',
        'work_order_parts.quantity as required_quantity',
        'parts.name as part_name',
        'parts.code as part_code',
        'parts.model as part_model',
        'parts.unit',
        'parts.unit_price',
      )
      .where('work_order_parts.work_order_id', id);

    if (requiredParts.length === 0) {
      return res.json({ items: [] });
    }

    // 获取当前库存（按 part_id 汇总）
    const partIds = requiredParts.map(p => p.part_id);
    const stockData = await db('stock_records')
      .select('part_id')
      .sum('quantity as total_stock')
      .whereIn('part_id', partIds)
      .groupBy('part_id');

    const stockMap = {};
    for (const s of stockData) {
      stockMap[s.part_id] = Number(s.total_stock);
    }

    // 组装结果
    const items = requiredParts.map(p => {
      const stock = stockMap[p.part_id] || 0;
      const toPurchase = Math.max(0, p.required_quantity - stock);
      return {
        part_id: p.part_id,
        part_name: p.part_name,
        part_code: p.part_code,
        part_model: p.part_model,
        unit: p.unit,
        unit_price: p.unit_price ? Number(p.unit_price) : null,
        required_quantity: Number(p.required_quantity),
        stock_quantity: stock,
        to_purchase: toPurchase,
      };
    });

    res.json({ items });
  } catch (err) { next(err); }
};
