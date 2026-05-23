import bcrypt from 'bcryptjs';

export async function up(knex) {
  // 1. Create personnel table (skip if already exists)
  const hasPersonnel = await knex.schema.hasTable('personnel');
  if (!hasPersonnel) {
    await knex.schema.createTable('personnel', (table) => {
      table.increments('id').primary();
      table.string('name', 100).notNullable();
      table.string('phone', 20);
      table.string('position', 100);
      table.date('hire_date');
      table.enu('status', ['active', 'resigned']).defaultTo('active').notNullable();
      table.date('resignation_date');
      table.text('notes');
      table.timestamps(true, true);
    });
  }

  // 2. Add personnel_id and is_active to users (skip if already exist)
  const hasPersonnelId = await knex.schema.hasColumn('users', 'personnel_id');
  if (!hasPersonnelId) {
    await knex.schema.table('users', (table) => {
      table.integer('personnel_id')
        .unsigned()
        .references('id')
        .inTable('personnel')
        .onDelete('SET NULL');
    });
  }
  const hasIsActive = await knex.schema.hasColumn('users', 'is_active');
  if (!hasIsActive) {
    await knex.schema.table('users', (table) => {
      table.boolean('is_active').defaultTo(true).notNullable();
    });
  }

  // 3. Backfill: for each existing user without personnel_id, create a personnel record
  const usersToBackfill = await knex('users').whereNull('personnel_id').select('*');
  for (const user of usersToBackfill) {
    const insertResult = await knex('personnel').insert({
      name: user.name,
      phone: user.phone || '',
      position: '',
      status: 'active',
    }).returning('id');
    const personnelId = insertResult?.[0]?.id ?? insertResult?.id ?? insertResult;
    await knex('users').where({ id: user.id }).update({ personnel_id: personnelId });
  }

  // 4. Add 'admin' role — update CHECK constraint to include 'admin'
  await knex.raw(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
  await knex.raw(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('maintenance', 'warehouse', 'procurement', 'admin'))`);

  // 5. Create admin user (skip if already exists)
  const adminExists = await knex('users').where({ username: 'admin' }).first();
  if (!adminExists) {
    // Check if admin personnel record already exists
    let adminPersonnelId = null;
    const existingAdminPersonnel = await knex('personnel').where({ name: '系统管理员', position: '系统管理员' }).first();
    if (existingAdminPersonnel) {
      adminPersonnelId = existingAdminPersonnel.id;
    } else {
      const adminPersonnelResult = await knex('personnel').insert({
        name: '系统管理员',
        phone: '',
        position: '系统管理员',
        status: 'active',
      }).returning('id');
      adminPersonnelId = adminPersonnelResult?.[0]?.id ?? adminPersonnelResult?.id ?? adminPersonnelResult;
    }

    const adminHash = await bcrypt.hash('admin123', 10);
    await knex('users').insert({
      username: 'admin',
      password_hash: adminHash,
      name: '系统管理员',
      role: 'admin',
      personnel_id: adminPersonnelId,
      is_active: true,
    });
  }
}

export async function down(knex) {
  // Remove admin user and personnel record
  await knex('users').where({ username: 'admin' }).del();
  await knex('personnel').where({ name: '系统管理员', position: '系统管理员' }).del();

  // Drop columns from users table
  await knex.schema.table('users', (table) => {
    table.dropColumn('personnel_id');
    table.dropColumn('is_active');
  });

  // Drop personnel table
  await knex.schema.dropTableIfExists('personnel');
}
