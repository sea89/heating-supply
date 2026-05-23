export function up(knex) {
  return knex.schema.table('purchase_order_items', (table) => {
    table.decimal('unit_price', 12, 2).nullable();
    table.decimal('total_price', 12, 2).nullable();
  }).then(() => {
    return knex.schema.table('purchase_orders', (table) => {
      table.decimal('total_amount', 14, 2).nullable();
    });
  });
};

export function down(knex) {
  return knex.schema.table('purchase_order_items', (table) => {
    table.dropColumn('unit_price');
    table.dropColumn('total_price');
  }).then(() => {
    return knex.schema.table('purchase_orders', (table) => {
      table.dropColumn('total_amount');
    });
  });
};
