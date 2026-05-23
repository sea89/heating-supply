export function up(knex) {
  return knex.schema
    .table('parts', (table) => {
      table.decimal('unit_price', 12, 2).nullable();
    })
    .table('tools', (table) => {
      table.decimal('unit_price', 12, 2).nullable();
    });
};

export function down(knex) {
  return knex.schema
    .table('parts', (table) => {
      table.dropColumn('unit_price');
    })
    .table('tools', (table) => {
      table.dropColumn('unit_price');
    });
};
