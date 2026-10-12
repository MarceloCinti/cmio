import { expect, test } from "@playwright/test";
import { DEMO } from "./env";
import { collectErrors, expectNoHorizontalOverflow, login } from "./helpers";

test.describe("Agenda", () => {
  test("una persona paciente agenda una consulta desde el portal", async ({ page }) => {
    const errors = collectErrors(page);
    await login(page, DEMO.paciente);
    await expect(page).toHaveURL(/\/portal$/);
    await page.goto("/portal/citas/nueva");
    await page.getByRole("radio", { name: /Nutrición/ }).first().click();
    await page.getByRole("button", { name: /Continuar/ }).click();
    await page.getByRole("radio", { name: /Consulta de nutrición/ }).click();
    await page.getByRole("button", { name: /Continuar/ }).click();
    const slot = page.locator('[role="radiogroup"][aria-label^="Horarios"] button:not([disabled])').first();
    await expect(slot).toBeVisible({ timeout: 15_000 });
    await slot.click();
    await page.getByRole("button", { name: /Continuar/ }).click();
    await expectNoHorizontalOverflow(page);
    await page.getByRole("button", { name: /Confirmar cita/ }).click();
    await expect(page).toHaveURL(/\/portal\/citas\/[^/]+\?nueva=1/, { timeout: 20_000 });
    await expect(page.getByText(/Consulta de nutrición/).first()).toBeVisible();
    await page.goto("/portal/citas");
    await expect(page.getByText(/Consulta de nutrición/).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("la secretaría ve la recepción del día y la agenda", async ({ page }) => {
    const errors = collectErrors(page);
    await login(page, DEMO.secretaria);
    await page.goto("/panel/recepcion");
    await expect(page.getByRole("heading", { name: "Recepción", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sala de espera" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const res = await page.goto("/panel/agenda");
    expect(res?.status()).toBe(200);
    await expectNoHorizontalOverflow(page);
    expect(errors).toEqual([]);
  });
});
