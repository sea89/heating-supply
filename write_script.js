const fs = require('fs');
const path = 'C:\\\\Users\\\\robin\\\\Downloads\\\\superpowers-5.1.0\\\\heating-supply-app\\\\server\\\\src\\\\controllers\\\\purchasesController.js';
let content = fs.readFileSync(path, 'utf8');
const func = "export const updateItem = async (req, res, next) => {
  try {
    const { id, itemId } = req.params;
    const { quantity } = req.body;
    const order = await db(\"purchase_orders\").where(\"id\", id).first();
    if (!order) return res.status(404).json({ error: \"采购单不存在\" });
    if (order.status === \"completed\") return res.status(400).json({ error: \"已完成采购单不可修改\" });
    const item = await db(\"purchase_order_items\").where(\"id\", itemId).where(\"purchase_order_id\", id).first();
    if (!item) return res.status(404).json({ error: \"采购项不存在\" });
    const arrived = Number(item.arrived_quantity) || 0;
    const newQty = Number(quantity) || 0;
    if (arrived > 0 && newQty < arrived) {
      return res.status(400).json({ error: \"已到货 \" + arrived + \"，数量不能少于已到货数量\" });
    }
    const unitPrice = Number(item.unit_price) || 0;
    const totalPrice = unitPrice > 0 ? +((newQty * unitPrice).toFixed(2)) : null;
    await db(\"purchase_order_items\").where(\"id\", itemId).update({ quantity: newQty, total_price: totalPrice });
    const allItems = await db(\"purchase_order_items\").where(\"purchase_order_id\", id);
    const orderTotal = allItems.reduce((sum, i) => sum + (Number(i.total_price) || 0), 0);
    await db(\"purchase_orders\").where(\"id\", id).update({ total_amount: orderTotal > 0 ? orderTotal : null });
    res.json({ success: true, quantity: newQty, total_price: totalPrice });
  } catch (err) { next(err); }
};
";
content = content.replace('export const arrival', func + '\\n' + 'export const arrival');
fs.writeFileSync(path, content, 'utf8');
console.log('OK');