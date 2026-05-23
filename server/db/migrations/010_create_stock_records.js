export function up(knex) {
  return knex.schema.createTable('stock_records', (table) => {
    table.increments('id').primary();
    table.integer('part_id')
      .unsigned()
      .references('id')
      .inTable('parts')
      .onDelete('CASCADE');
    table.integer('location_id')
      .unsigned()
      .references('id')
      .inTable('locations')
      .onDelete('SET NULL');
    table.decimal('quantity', 10, 2).notNullable().defaultTo(0);
    table.unique(['part_id', 'location_id']);
    table.timestamps(true, true);
  });
};

export function down(knex) {
  return knex.schema.dropTableIfExists('stock_records');
};
