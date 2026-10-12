// Variables de entorno para las pruebas. Usa una base de datos separada cuyo nombre
// debe terminar en "_test" (las pruebas vacían sus tablas).
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://cmio:cmio_dev_local@localhost:5432/cmio_test";

export function assertTestDatabase(url: string) {
  const name = new URL(url).pathname.replace(/^\//, "");
  if (!name.endsWith("_test")) {
    throw new Error(`Por seguridad, las pruebas solo se ejecutan en bases cuyo nombre termina en "_test" (recibido: ${name}).`);
  }
}

export function applyTestEnv() {
  assertTestDatabase(TEST_DATABASE_URL);
  Object.assign(process.env, {
    NODE_ENV: "test",
    DATABASE_URL: TEST_DATABASE_URL,
    APP_URL: "http://localhost:3100",
    EMAIL_DRIVER: "file",
    EMAIL_FILE_DIR: ".data/test-mail",
    EMAIL_FROM: "CMIO Pruebas <pruebas@localhost>",
    WHATSAPP_PROVIDER: "disabled",
    STORAGE_DRIVER: "local",
    STORAGE_LOCAL_PATH: ".data/test-storage",
    CRON_SECRET: "secreto-de-pruebas-0123456789-abcdefghijkl",
  });
}
