export function up(knex) {
  return knex.schema.createTable('locations', (table) => {
    table.increments('id').primary();
    table.string('warehouse', 100).notNullable();
    table.string('shelf', 100).notNullable();
    table.string('bin', 100).notNullable();
    table.enu('type', ['normal', 'temperature_controlled', 'outdoor']).defaultTo('normal');
    table.unique(['warehouse', 'shelf', 'bin']);
    table.timestamps(true, true);
  });
};

export function down(knex) {
  return knex.schema.dropTableIfExists('locations');
};
