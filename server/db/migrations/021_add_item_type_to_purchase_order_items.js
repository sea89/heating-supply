export function up(knex) {
  return knex.schema.table('purchase_order_items', (table) => {
    table.string('item_type', 10).defaultTo('part').notNullable();
    table.integer('tool_id')
      .unsigned()
      .references('id')
      .inTable('tools')
      .onDelete('SET NULL');
  }).then(async () => {
    await knex.raw('ALTER TABLE purchase_order_items ALTER COLUMN part_id DROP NOT NULL');
  });
};

export function down(knex) {
  return knex.schema.table('purchase_order_items', (table) => {
    table.dropColumn('item_type');
    table.dropColumn('tool_id');
  });
};
