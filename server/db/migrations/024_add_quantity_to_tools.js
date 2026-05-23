export function up(knex) {
  return knex.schema.table('tools', (table) => {
    table.integer('quantity').notNullable().defaultTo(1);
  });
};

export function down(knex) {
  return knex.schema.table('tools', (table) => {
    table.dropColumn('quantity');
  });
};
