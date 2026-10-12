import { execSync } from "node:child_process";
import pg from "pg";
import { assertTestDatabase } from "../helpers/test-env";
import { E2E_DATABASE_URL } from "./env";

// Prepara una base exclusiva para E2E: migraciones, vaciado y datos de demostración ficticios.
export default async function globalSetup() {
  assertTestDatabase(E2E_DATABASE_URL);
  const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: E2E_DATABASE_URL, NODE_ENV: "test" };
  execSync("npx prisma migrate deploy", { env, stdio: "pipe" });
  const client = new pg.Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  const { rows } = await client.query<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'",
  );
  await client.query(`TRUNCATE TABLE ${rows.map((r) => `"${r.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  await client.end();
  execSync("npx tsx prisma/seed.ts", { env, stdio: "pipe" });
  execSync("npx tsx prisma/seed-demo.ts", { env: { ...env, DEMO_MODE: "true" }, stdio: "pipe" });
}
