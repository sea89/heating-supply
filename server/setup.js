import 'dotenv/config';
import knex from 'knex';

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  migrations: { directory: './db/migrations' },
  seeds: { directory: './db/seeds' }
});

async function run() {
  try {
    // Run migrations (always)
    const migrateResult = await db.migrate.latest();
    if (Array.isArray(migrateResult)) {
      const [batch, migrations] = migrateResult;
      console.log(`迁移完成: ${migrations.length} 个文件 (batch ${batch})`);
    } else {
      console.log('迁移完成');
    }

    // Only run seeds if database is empty (first deployment)
    const userCount = await db('users').count('* as cnt').first();
    if (parseInt(userCount?.cnt || 0) === 0) {
      await db.seed.run();
      console.log('种子数据导入完成');
    } else {
      console.log('数据库已有数据，跳过种子数据导入');
    }

    await db.destroy();
    process.exit(0);
  } catch (err) {
    console.error('错误:', err);
    process.exit(1);
  }
}

run();
