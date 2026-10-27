import { expect, test } from "./fixtures";

test("el panel exige iniciar sesión", async ({ page }) => {
  await page.goto("/admin/pedidos");
  await expect(page).toHaveURL(/\/ingresar\?next=%2Fadmin%2Fpedidos$/);
  await expect(page.getByLabel("Correo electrónico")).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toBeVisible();
});

test("cabeceras de seguridad", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("robots.txt, sitemap y manifest", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toMatch(/User-Agent: \*/i);

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain("<urlset");

  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
});

test("sugerencias del buscador", async ({ request }) => {
  const response = await request.get("/api/sugerencias?q=ss");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toMatchObject({
    products: expect.any(Array),
    categories: expect.any(Array),
    brands: expect.any(Array),
  });
});

test("soporte: preguntas frecuentes desplegables", async ({ page }) => {
  await page.goto("/soporte");
  await expect(page.getByRole("heading", { level: 1, name: "¿En qué te ayudamos?" })).toBeVisible();
  const question = page.getByText("¿Cómo pago mi pedido?");
  await question.click();
  await expect(page.getByText(/quedan reservados para ti durante 48 horas/)).toBeVisible();
});

test("menú de categorías: abre, se recorre con teclado y cierra con Esc", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "El mega menú es de escritorio; en móvil se usa el panel lateral.");
  await page.goto("/");
  const trigger = page
    .getByRole("navigation", { name: "Menú de categorías" })
    .getByRole("button", { name: "Categorías" });
  test.skip(!(await trigger.count()), "El catálogo aún no tiene categorías.");

  await trigger.click();
  const panel = page.getByRole("navigation", { name: "Menú de categorías" }).getByRole("link");
  await expect(panel.first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel.first()).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("menú móvil: alterna el modo oscuro", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Solo en móvil.");
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir menú" }).click();
  const toggle = page.getByRole("dialog").getByRole("switch", { name: "Modo oscuro" });
  const wasDark = (await toggle.getAttribute("aria-checked")) === "true";
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", String(!wasDark));
});
