export function up(knex) {
  return knex.schema.createTable('work_order_parts', (table) => {
    table.increments('id').primary();
    table.integer('work_order_id')
      .unsigned()
      .references('id')
      .inTable('work_orders')
      .onDelete('CASCADE');
    table.integer('part_id')
      .unsigned()
      .references('id')
      .inTable('parts');
    table.decimal('quantity', 10, 2).notNullable();
  });
};

export function down(knex) {
  return knex.schema.dropTableIfExists('work_order_parts');
};
