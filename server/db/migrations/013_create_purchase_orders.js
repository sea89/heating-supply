export function up(knex) {
  return knex.schema.createTable('purchase_orders', (table) => {
    table.increments('id').primary();
    table.string('order_no', 50).unique().notNullable();
    table.enu('status', ['pending', 'ordered', 'partial_arrived', 'completed']).defaultTo('pending');
    table.enu('priority', ['normal', 'urgent']).defaultTo('normal');
    table.integer('created_by')
      .unsigned()
      .references('id')
      .inTable('users');
    table.text('remark');
    table.timestamps(true, true);
  });
};

export function down(knex) {
  return knex.schema.dropTableIfExists('purchase_orders');
};
