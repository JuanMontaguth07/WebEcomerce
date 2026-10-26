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
