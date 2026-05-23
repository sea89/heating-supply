export function up(knex) {
  return knex.schema.createTable('part_equipment', (table) => {
    table.increments('id').primary();
    table.integer('part_id')
      .unsigned()
      .references('id')
      .inTable('parts')
      .onDelete('CASCADE');
    table.integer('equipment_id')
      .unsigned()
      .references('id')
      .inTable('equipment')
      .onDelete('CASCADE');
    table.unique(['part_id', 'equipment_id']);
  });
};

export function down(knex) {
  return knex.schema.dropTableIfExists('part_equipment');
};
