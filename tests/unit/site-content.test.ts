import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_CONTENT, SITE_CONTENT_KEYS, SITE_CONTENT_SCHEMAS, whatsappHref } from "@/lib/site-content";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";

describe("Contenido predeterminado del sitio", () => {
  it.each(SITE_CONTENT_KEYS)("«%s» cumple las mismas reglas que el editor del panel", (key) => {
    const result = SITE_CONTENT_SCHEMAS[key].safeParse(DEFAULT_SITE_CONTENT[key]);
    expect(result.success, result.success ? "" : JSON.stringify(result.error.issues)).toBe(true);
  });

  it("el enlace de WhatsApp se arma desde el número confirmado", () => {
    expect(whatsappHref(DEFAULT_SITE_CONTENT.institution.whatsappNumber)).toMatch(/^https:\/\/wa\.me\/595974824111/);
  });
});

describe("Cuentas de demostración", () => {
  it("usan el dominio reservado de demostración y correos únicos", () => {
    expect(DEMO_ACCOUNTS.every((a) => a.email.endsWith("@demo.cmio.local"))).toBe(true);
    expect(new Set(DEMO_ACCOUNTS.map((a) => a.email)).size).toBe(DEMO_ACCOUNTS.length);
    expect(DEMO_ACCOUNTS.some((a) => a.role === "PATIENT")).toBe(true);
  });
});
