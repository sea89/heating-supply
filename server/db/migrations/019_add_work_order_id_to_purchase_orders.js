export function up(knex) {
  return knex.schema.table('purchase_orders', (table) => {
    table.integer('work_order_id')
      .unsigned()
      .references('id')
      .inTable('work_orders')
      .onDelete('SET NULL');
  });
};

export function down(knex) {
  return knex.schema.table('purchase_orders', (table) => {
    table.dropColumn('work_order_id');
  });
};
