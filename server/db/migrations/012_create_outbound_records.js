export function up(knex) {
  return knex.schema.createTable('outbound_records', (table) => {
    table.increments('id').primary();
    table.integer('part_id')
      .unsigned()
      .references('id')
      .inTable('parts');
    table.decimal('quantity', 10, 2).notNullable();
    table.integer('location_id')
      .unsigned()
      .references('id')
      .inTable('locations');
    table.string('recipient', 100);
    table.integer('work_order_id').unsigned();
    table.integer('created_by')
      .unsigned()
      .references('id')
      .inTable('users');
    table.text('remark');
    table.timestamps(true, true);
  });
};

export function down(knex) {
  return knex.schema.dropTableIfExists('outbound_records');
};
