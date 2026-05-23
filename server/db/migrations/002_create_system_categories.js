export function up(knex) {
  return knex.schema.createTable('system_categories', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.text('description');
    table.integer('parent_id')
      .unsigned()
      .references('id')
      .inTable('system_categories')
      .onDelete('SET NULL');
    table.timestamps(true, true);
  });
};

export function down(knex) {
  return knex.schema.dropTableIfExists('system_categories');
};
