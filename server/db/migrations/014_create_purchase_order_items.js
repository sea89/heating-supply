export function up(knex) {
  return knex.schema.createTable('purchase_order_items', (table) => {
    table.increments('id').primary();
    table.integer('purchase_order_id')
      .unsigned()
      .references('id')
      .inTable('purchase_orders')
      .onDelete('CASCADE');
    table.integer('part_id')
      .unsigned()
      .references('id')
      .inTable('parts');
    table.decimal('quantity', 10, 2).notNullable();
    table.decimal('arrived_quantity', 10, 2).defaultTo(0);
  });
};

export function down(knex) {
  return knex.schema.dropTableIfExists('purchase_order_items');
};
