export function up(knex) {
  return knex.schema.createTable('parts', (table) => {
    table.increments('id').primary();
    table.string('code', 50).unique().notNullable();
    table.string('name', 200).notNullable();
    table.string('model', 200);
    table.string('specification', 200);
    table.string('unit', 20).notNullable();
    table.integer('category_id')
      .unsigned()
      .references('id')
      .inTable('part_categories')
      .onDelete('SET NULL');
    table.decimal('min_stock', 10, 2).defaultTo(0);
    table.decimal('max_stock', 10, 2).defaultTo(0);
    table.timestamps(true, true);
  });
};

export function down(knex) {
  return knex.schema.dropTableIfExists('parts');
};
