import "server-only";
import { z } from "zod";

const boolish = z
  .enum(["true", "false", "1", "0", ""])
  .optional()
  .transform((v) => v === "true" || v === "1");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatorio"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  CRON_SECRET: z.string().min(32, "CRON_SECRET debe tener al menos 32 caracteres").optional(),
  TRUST_PROXY: boolish,
  DEMO_MODE: boolish,

  EMAIL_DRIVER: z.enum(["smtp", "file", "disabled"]).default("disabled"),
  EMAIL_FROM: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_SECURE: boolish,
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),

  WHATSAPP_PROVIDER: z.enum(["meta", "disabled"]).default("disabled"),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_API_VERSION: z.string().default("v21.0"),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),

  STORAGE_DRIVER: z.enum(["local"]).default("local"),
  STORAGE_LOCAL_PATH: z.string().default("./storage"),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  // Las variables vacías (p. ej., copiadas de .env.example) se tratan como no definidas.
  const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ""));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Configuración de entorno inválida:\n${issues}`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === "production") {
    if (env.EMAIL_DRIVER === "file") {
      throw new Error("EMAIL_DRIVER=file solo puede usarse en desarrollo o pruebas.");
    }
    if (!env.APP_URL.startsWith("https://")) {
      console.warn("[cmio] APP_URL no usa HTTPS. En producción el sitio debe servirse por HTTPS.");
    }
  }
  return env;
}

let cached: Env | undefined;

export function env(): Env {
  if (!cached) cached = load();
  return cached;
}

export const isProduction = () => env().NODE_ENV === "production";

/** Solo para pruebas: vuelve a leer las variables de entorno. */
export function resetEnvCacheForTests() {
  if (process.env.NODE_ENV !== "test") return;
  cached = undefined;
}
