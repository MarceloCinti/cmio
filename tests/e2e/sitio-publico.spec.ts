import { expect, test } from "@playwright/test";
import { collectErrors, expectNoHorizontalOverflow } from "./helpers";

test.describe("Sitio público", () => {
  test("la portada carga en español, sin errores y con CSP", async ({ page }) => {
    const errors = collectErrors(page);
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
    expect(res?.headers()["content-security-policy"]).toContain("nonce-");
    await expect(page.locator("html")).toHaveAttribute("lang", "es-PY");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Un enfoque integral para cuidar tu salud y bienestar.");
    await expect(page.getByRole("link", { name: "Agendar una consulta" }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expect(errors).toEqual([]);
  });

  test("la portada destaca al Dr. Hugo Rojas con enlace a su perfil publicado", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator('section[aria-labelledby="hero-titulo"]');
    const card = hero.getByRole("link", { name: /Dr\. Hugo Rojas/ });
    await expect(card).toBeVisible();
    await expect(card).toContainText("Al frente del CMIO");
    // La foto principal es de banco de imágenes: se aclara y no se rotula con el nombre del médico.
    await expect(hero.getByText("Imagen ilustrativa")).toBeVisible();
    await expect(hero.getByText("Dr. Hugo Rojas · CMIO")).toHaveCount(0);
    await card.click();
    await expect(page).toHaveURL(/\/profesionales\/dr-hugo-rojas$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Hugo Rojas");
  });

  test("muestra datos de contacto y horario configurables", async ({ page }) => {
    await page.goto("/contacto");
    await expect(page.getByText("+595 974 824 111").first()).toBeVisible();
    await expect(page.getByText(/09:00/).first()).toBeVisible();
  });

  test("las páginas principales responden y no desbordan en ningún ancho", async ({ page }) => {
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/", "/especialidades", "/servicios", "/profesionales", "/preguntas-frecuentes", "/contacto", "/ingresar", "/registro"]) {
        const res = await page.goto(path);
        expect(res?.status(), `${path} @${width}`).toBe(200);
        await expectNoHorizontalOverflow(page);
      }
    }
  });

  test("el formulario de contacto exige consentimiento", async ({ page }) => {
    await page.goto("/solicitar-cita");
    await page.getByLabel("Nombre y apellido").fill("Persona de Prueba");
    await page.getByLabel("Teléfono").fill("0981 123 456");
    await page.getByRole("button", { name: "Enviar solicitud" }).click();
    await expect(page.getByText("Debes aceptar el aviso de tratamiento de datos para enviar la solicitud.")).toBeVisible();
  });

  test("las páginas inexistentes muestran un 404 en español", async ({ page }) => {
    const res = await page.goto("/no-existe");
    expect(res?.status()).toBe(404);
    await expect(page.getByText(/no encontr/i).first()).toBeVisible();
  });
});
