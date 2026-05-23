export function up(knex) {
  return knex.schema.createTable('work_orders', (table) => {
    table.increments('id').primary();
    table.string('order_no', 50).unique().notNullable();
    table.integer('equipment_id')
      .unsigned()
      .references('id')
      .inTable('equipment');
    table.text('fault_description');
    table.integer('assignee_id')
      .unsigned()
      .references('id')
      .inTable('users');
    table.enu('status', ['pending', 'in_progress', 'completed']).defaultTo('pending');
    table.text('completion_note');
    table.timestamp('completed_at');
    table.timestamps(true, true);
  });
};

export function down(knex) {
  return knex.schema.dropTableIfExists('work_orders');
};
