import 'dotenv/config';
import Knex from 'knex';

const db = Knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  migrations: { directory: './db/migrations' },
});

try {
  const [batch, migrations] = await db.migrate.latest();
  if (migrations.length === 0) {
    console.log('Already up to date');
  } else {
    console.log(`Batch ${batch} ran: ${migrations.join(', ')}`);
  }
} catch (err) {
  console.error('Migration failed:', err);
  process.exit(1);
} finally {
  await db.destroy();
}
