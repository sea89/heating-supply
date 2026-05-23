import knex from 'knex';

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/heating_supply',
  migrations: { directory: './db/migrations' },
  seeds: { directory: './db/seeds' }
});

async function run() {
  try {
    await db.seed.run();
    console.log('种子数据导入完成');
    await db.destroy();
    process.exit(0);
  } catch (err) {
    console.error('错误:', err);
    process.exit(1);
  }
}

run();
