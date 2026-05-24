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

export const cleanupCorrupted = async (req, res, next) => {
  try {
    const results = { deleted: {}, errors: [] };

    // Find and delete parts with corrupted names (containing ???? or non-UTF8 chars)
    const allParts = await db("parts").select("id", "name", "code");
    const corruptedParts = allParts.filter(function(p) {
      return p.name && (p.name.indexOf("\uFFFD") >= 0 || p.name.indexOf("?") >= 0);
    });
    if (corruptedParts.length > 0) {
      var ids = corruptedParts.map(function(p) { return p.id; });
      await db("stock_records").whereIn("part_id", ids).del();
      await db("work_order_parts").whereIn("part_id", ids).del();
      await db("purchase_order_items").whereIn("part_id", ids).del();
      await db("part_suppliers").whereIn("part_id", ids).del();
      await db("part_equipment").whereIn("part_id", ids).del();
      await db("inbound_records").whereIn("part_id", ids).del();
      await db("outbound_records").whereIn("part_id", ids).del();
      await db("parts").whereIn("id", ids).del();
      results.deleted.parts = corruptedParts.length;
    }

    // Find and delete corrupted categories
    var cats = await db("part_categories").select("id", "name");
    var badCats = cats.filter(function(c) { return c.name && c.name.indexOf("\uFFFD") >= 0; });
    if (badCats.length > 0) {
      var catIds = badCats.map(function(c) { return c.id; });
      await db("parts").whereIn("category_id", catIds).update({ category_id: null });
      await db("part_categories").whereIn("id", catIds).del();
      results.deleted.categories = badCats.length;
    }

    // Find and delete corrupted system categories
    var sysCats = await db("system_categories").select("id", "name");
    var badSys = sysCats.filter(function(c) { return c.name && c.name.indexOf("\uFFFD") >= 0; });
    if (badSys.length > 0) {
      var sysIds = badSys.map(function(c) { return c.id; });
      await db("equipment").whereIn("system_category_id", sysIds).update({ system_category_id: null });
      await db("system_categories").whereIn("id", sysIds).del();
      results.deleted.systemCategories = badSys.length;
    }

    // Find and delete corrupted equipment
    var equip = await db("equipment").select("id", "name");
    var badEquip = equip.filter(function(e) { return e.name && e.name.indexOf("\uFFFD") >= 0; });
    if (badEquip.length > 0) {
      var equipIds = badEquip.map(function(e) { return e.id; });
      await db("work_orders").whereIn("equipment_id", equipIds).update({ equipment_id: null });
      await db("part_equipment").whereIn("equipment_id", equipIds).del();
      await db("equipment").whereIn("id", equipIds).del();
      results.deleted.equipment = badEquip.length;
    }

    // Find and delete corrupted suppliers
    var supp = await db("suppliers").select("id", "name");
    var badSupp = supp.filter(function(s) { return s.name && s.name.indexOf("\uFFFD") >= 0; });
    if (badSupp.length > 0) {
      var suppIds = badSupp.map(function(s) { return s.id; });
      await db("part_suppliers").whereIn("supplier_id", suppIds).del();
      await db("inbound_records").whereIn("supplier_id", suppIds).update({ supplier_id: null });
      await db("suppliers").whereIn("id", suppIds).del();
      results.deleted.suppliers = badSupp.length;
    }

    // Find and delete corrupted tools
    var tools = await db("tools").select("id", "name");
    var badTools = tools.filter(function(t) { return t.name && t.name.indexOf("\uFFFD") >= 0; });
    if (badTools.length > 0) {
      var toolIds = badTools.map(function(t) { return t.id; });
      await db("tool_borrows").whereIn("tool_id", toolIds).del();
      await db("purchase_order_items").whereIn("tool_id", toolIds).del();
      await db("tools").whereIn("id", toolIds).del();
      results.deleted.tools = badTools.length;
    }

    // Find and delete corrupted parts (by checking code+name mismatch pattern)
    // Also check for names that are just replacement characters
    for (var i = 0; i < allParts.length; i++) {
      var p = allParts[i];
      if (p.name && /^[\?\uFFFD\s]+$/.test(p.name)) {
        // Already handled above, but double check
      }
    }

    res.json({ success: true, ...results });
  } catch (err) { next(err); }
};
