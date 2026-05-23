export function up(knex) {
  return knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('username', 50).unique().notNullable();
    table.string('password_hash').notNullable();
    table.string('name', 100).notNullable();
    table.string('phone', 20);
    table.enu('role', ['maintenance', 'warehouse', 'procurement']).notNullable();
    table.timestamps(true, true);
  });
};

export function down(knex) {
  return knex.schema.dropTableIfExists('users');
};
