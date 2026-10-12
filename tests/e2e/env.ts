import path from "node:path";

export const E2E_PORT = 3100;
export const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgresql://cmio:cmio_dev_local@localhost:5432/cmio_e2e_test";

// Entorno del servidor durante las pruebas E2E (sin integraciones externas reales).
export const E2E_ENV: Record<string, string> = {
  DATABASE_URL: E2E_DATABASE_URL,
  APP_URL: `http://localhost:${E2E_PORT}`,
  PORT: String(E2E_PORT),
  HOSTNAME: "localhost",
  CRON_SECRET: "e2e-cron-secret-0123456789abcdef0123456789",
  EMAIL_DRIVER: "disabled",
  WHATSAPP_PROVIDER: "disabled",
  STORAGE_LOCAL_PATH: path.resolve(".data/e2e-storage"),
  DEMO_MODE: "false",
  TRUST_PROXY: "false",
};

export const DEMO = {
  propietario: { email: "propietario@demo.cmio.local", password: "Demo-Propietario-2026" },
  secretaria: { email: "secretaria@demo.cmio.local", password: "Demo-Secretaria-2026" },
  medico: { email: "medico@demo.cmio.local", password: "Demo-Medico-2026" },
  paciente: { email: "paciente@demo.cmio.local", password: "Demo-Paciente-2026" },
};
