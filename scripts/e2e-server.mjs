// Inicia el build standalone para las pruebas E2E (copia los recursos estáticos como en producción).
import { cpSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";

const dir = ".next/standalone";
if (!existsSync(`${dir}/server.js`)) {
  console.error("No existe el build de producción. Ejecuta `pnpm build` antes de `pnpm test:e2e`.");
  process.exit(1);
}
cpSync("public", `${dir}/public`, { recursive: true });
cpSync(".next/static", `${dir}/.next/static`, { recursive: true });
const child = spawn(process.execPath, ["server.js"], { cwd: dir, stdio: "inherit", env: { ...process.env, NODE_ENV: "production" } });
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
child.on("exit", (code) => process.exit(code ?? 0));
