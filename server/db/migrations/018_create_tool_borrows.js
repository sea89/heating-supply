export function up(knex) {
  return knex.schema.createTable('tool_borrows', (table) => {
    table.increments('id').primary();
    table.integer('tool_id')
      .unsigned()
      .references('id')
      .inTable('tools')
      .onDelete('CASCADE');
    table.integer('borrower_user_id')
      .unsigned()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table.string('external_borrower_name', 100);
    table.string('external_borrower_phone', 50);
    table.string('external_borrower_company', 200);
    table.timestamp('borrowed_at').defaultTo(knex.fn.now());
    table.timestamp('expected_return_at');
    table.timestamp('returned_at');
    table.string('purpose', 500);
    table.text('damage_note');
    table.timestamps(true, true);
  });
};

export function down(knex) {
  return knex.schema.dropTableIfExists('tool_borrows');
};
