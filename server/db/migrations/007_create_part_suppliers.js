export function up(knex) {
  return knex.schema.createTable('part_suppliers', (table) => {
    table.increments('id').primary();
    table.integer('part_id')
      .unsigned()
      .references('id')
      .inTable('parts')
      .onDelete('CASCADE');
    table.integer('supplier_id')
      .unsigned()
      .references('id')
      .inTable('suppliers')
      .onDelete('CASCADE');
    table.unique(['part_id', 'supplier_id']);
  });
};

export function down(knex) {
  return knex.schema.dropTableIfExists('part_suppliers');
};
