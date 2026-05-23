export function up(knex) {
  return knex.schema.createTable('part_categories', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.integer('parent_id')
      .unsigned()
      .references('id')
      .inTable('part_categories')
      .onDelete('SET NULL');
    table.timestamps(true, true);
  });
};

export function down(knex) {
  return knex.schema.dropTableIfExists('part_categories');
};
