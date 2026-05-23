export function up(knex) {
  return knex.schema.createTable('tools', (table) => {
    table.increments('id').primary();
    table.string('code', 50).unique().notNullable();
    table.string('name', 200).notNullable();
    table.string('model', 200);
    table.string('category', 100);
    table.enu('status', ['available', 'borrowed', 'maintenance', 'scrapped']).defaultTo('available');
    table.string('location', 200);
    table.timestamps(true, true);
  });
};

export function down(knex) {
  return knex.schema.dropTableIfExists('tools');
};
