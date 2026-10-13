import { expect, test } from "@playwright/test";
import { DEMO } from "./env";
import { login } from "./helpers";

test.describe("Acceso y permisos", () => {
  test("las áreas privadas exigen iniciar sesión", async ({ page }) => {
    await page.goto("/portal");
    await expect(page).toHaveURL(/\/ingresar\?siguiente=%2Fportal/);
    await page.goto("/panel/pacientes");
    await expect(page).toHaveURL(/\/ingresar\?siguiente=%2Fpanel%2Fpacientes/);
  });

  test("fuera del modo demostración no se ofrecen usuarios de prueba", async ({ page }) => {
    await page.goto("/ingresar");
    await expect(page.getByRole("heading", { name: "Ingresar" })).toBeVisible();
    await expect(page.getByText("Usuarios de prueba")).toHaveCount(0);
    expect(await page.content()).not.toContain("demo.cmio.local");
  });

  test("credenciales incorrectas muestran un mensaje genérico", async ({ page }) => {
    await login(page, { email: DEMO.paciente.email, password: "Clave-incorrecta-1" }, { expectSuccess: false });
    await expect(page.getByText(/Correo o contraseña incorrectos/)).toBeVisible();
    await expect(page).toHaveURL(/\/ingresar/);
  });

  test("la cookie de sesión es segura y el paciente no entra al panel", async ({ page, context }) => {
    await login(page, DEMO.paciente);
    await expect(page).toHaveURL(/\/portal$/);
    const cookie = (await context.cookies()).find((c) => c.name.includes("cmio_sesion"));
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.secure).toBe(true);
    expect(cookie?.sameSite).toBe("Lax");
    await page.goto("/panel");
    await expect(page).toHaveURL(/\/portal$/);
  });

  test("la secretaría no accede a historias clínicas ni a usuarios", async ({ page }) => {
    await login(page, DEMO.secretaria);
    await expect(page).toHaveURL(/\/panel$/);
    await page.goto("/panel/usuarios");
    await expect(page).toHaveURL(/\/panel\/sin-permiso/);
    await page.goto("/panel/pacientes");
    await page.getByRole("link", { name: /Paciente Demo/ }).first().click();
    await expect(page).toHaveURL(/\/panel\/pacientes\/[^/]+$/);
    await expect(page.getByRole("link", { name: /Historia clínica/i })).toHaveCount(0);
    await page.goto(`${page.url()}/historia`);
    await expect(page).toHaveURL(/\/panel\/sin-permiso/);
  });

  test("cerrar sesión invalida el acceso", async ({ page }) => {
    await login(page, DEMO.paciente);
    await expect(page).toHaveURL(/\/portal$/);
    await page.getByRole("button", { name: /Cerrar sesión|Salir/ }).first().click();
    // Espera a que termine el cierre de sesión antes de navegar (si no, la navegación puede cortarlo).
    await expect(page).toHaveURL(/\/ingresar\?salida=1/);
    await expect(page.getByText("Cerraste tu sesión de forma segura.")).toBeVisible();
    await page.goto("/portal");
    await expect(page).toHaveURL(/\/ingresar/);
  });
});
