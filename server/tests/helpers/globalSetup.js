import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "..", "..");

process.env.DOTENV_CONFIG_PATH = path.join(serverRoot, ".env.test");

import "dotenv/config";

export default async function setup() {
  const { default: knex } = await import("knex");
  const adminUrl = process.env.DATABASE_URL.replace("/heating_supply_test", "/postgres");
  const adminDb = knex({ client: "pg", connection: adminUrl });
  try {
    const exists = await adminDb.raw("SELECT 1 FROM pg_database WHERE datname = 'heating_supply_test'");
    if (exists.rows.length === 0) {
      await adminDb.raw("CREATE DATABASE heating_supply_test");
      console.log("Created test database: heating_supply_test");
    }
  } finally {
    await adminDb.destroy();
  }
  const testDb = knex({ client: "pg", connection: process.env.DATABASE_URL });
  try {
    await testDb.migrate.latest({ directory: path.join(serverRoot, "db", "migrations") });
    console.log("Test migrations applied");
  } finally {
    await testDb.destroy();
  }
}
