import { expect, type Page } from "@playwright/test";

export async function login(page: Page, cred: { email: string; password: string }, { expectSuccess = true } = {}) {
  await page.goto("/ingresar");
  await page.getByLabel("Correo electrónico").fill(cred.email);
  await page.locator("input[name=password]").fill(cred.password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  if (expectSuccess) await page.waitForURL(/\/(portal|panel)(\/|$)/);
}

/** Registra errores de consola y de página (incluye violaciones de la CSP). */
export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return errors;
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "la página no debe desplazarse horizontalmente").toBeLessThanOrEqual(0);
}
