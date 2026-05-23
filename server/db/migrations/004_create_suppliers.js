export function up(knex) {
  return knex.schema.createTable('suppliers', (table) => {
    table.increments('id').primary();
    table.string('name', 200).notNullable();
    table.string('contact_person', 100);
    table.string('phone', 50);
    table.string('supply_category', 200);
    table.timestamps(true, true);
  });
};

export function down(knex) {
  return knex.schema.dropTableIfExists('suppliers');
};
