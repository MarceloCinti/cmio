// Prepara la plataforma para verla en una computadora local con datos de demostración.
// Uso: pnpm local:setup   (luego: pnpm dev y abrir http://localhost:3000)
//
// - Crea .env con valores de desarrollo si no existe (no modifica uno existente).
// - Aplica las migraciones, carga los datos base y los datos ficticios de demostración.
// Requiere PostgreSQL en ejecución (ver docs/INSTALACION.md, sección "Modo rápido").
import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

const DEFAULT_DB = "postgresql://cmio:cmio_local@localhost:5432/cmio_dev";

if (existsSync(".env")) {
  console.log("• Se usa el archivo .env existente (no se modifica).");
} else {
  const env = [
    "# Generado por pnpm local:setup — solo para desarrollo local, no usar en producción.",
    `DATABASE_URL="${process.env.LOCAL_DATABASE_URL ?? DEFAULT_DB}"`,
    'APP_URL="http://localhost:3000"',
    `CRON_SECRET="${randomBytes(32).toString("hex")}"`,
    'EMAIL_DRIVER="file"',
    'EMAIL_FROM="CMIO <no-responder@localhost>"',
    'WHATSAPP_PROVIDER="disabled"',
    'STORAGE_DRIVER="local"',
    'STORAGE_LOCAL_PATH="./storage"',
    'DEMO_MODE="true"',
    "",
  ].join("\n");
  writeFileSync(".env", env, { mode: 0o600 });
  console.log("• Se creó .env para desarrollo local.");
}

function run(label, command, extraEnv = {}) {
  console.log(`\n→ ${label}`);
  const res = spawnSync(command, { stdio: "inherit", shell: true, env: { ...process.env, ...extraEnv } });
  if (res.status !== 0) {
    console.error(`\n✖ Falló: ${label}.`);
    if (label.startsWith("Aplicando")) {
      console.error(
        "  ¿Está PostgreSQL en ejecución? Con Docker:\n" +
          "  docker run -d --name cmio-postgres -e POSTGRES_USER=cmio -e POSTGRES_PASSWORD=cmio_local -e POSTGRES_DB=cmio_dev -p 5432:5432 postgres:16",
      );
    }
    process.exit(res.status ?? 1);
  }
}

run("Aplicando migraciones de la base de datos", "pnpm exec prisma migrate deploy");
run("Cargando datos base", "pnpm db:seed");
run("Cargando datos ficticios de demostración", "pnpm db:seed:demo", { DEMO_MODE: "true" });

console.log(`
✔ Listo. Inicia la plataforma con:  pnpm dev
  y abre http://localhost:3000

  Cuentas de demostración (datos ficticios):
    propietario@demo.cmio.local  Demo-Propietario-2026
    secretaria@demo.cmio.local   Demo-Secretaria-2026
    medico@demo.cmio.local       Demo-Medico-2026
    paciente@demo.cmio.local     Demo-Paciente-2026
  Los correos no se envían: quedan como archivos en .data/mail
`);
