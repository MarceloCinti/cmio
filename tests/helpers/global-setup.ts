import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { TEST_DATABASE_URL, assertTestDatabase } from "./test-env";

// Aplica las migraciones pendientes (no destructivo) sobre la base de pruebas.
export default function setup() {
  assertTestDatabase(TEST_DATABASE_URL);
  const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };
  execSync("npx prisma migrate deploy", { env, stdio: "pipe" });
  rmSync(".data/test-mail", { recursive: true, force: true });
  rmSync(".data/test-storage", { recursive: true, force: true });
}
