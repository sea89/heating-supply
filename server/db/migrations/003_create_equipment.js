export function up(knex) {
  return knex.schema.createTable('equipment', (table) => {
    table.increments('id').primary();
    table.string('code', 50).unique().notNullable();
    table.string('name', 200).notNullable();
    table.string('model', 200);
    table.string('location', 200);
    table.integer('system_category_id')
      .unsigned()
      .references('id')
      .inTable('system_categories')
      .onDelete('SET NULL');
    table.timestamps(true, true);
  });
};

export function down(knex) {
  return knex.schema.dropTableIfExists('equipment');
};
