import { allowNotFound, expect, firstProductInStock, test } from "./fixtures";

const cartButton = (page: import("@playwright/test").Page) =>
  page.getByRole("banner").getByRole("button", { name: /^Carrito/ });

test("inicio: título y acceso al catálogo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Explorar catálogo" }).click();
  await expect(page).toHaveURL(/\/productos$/);
  await expect(page.getByRole("heading", { level: 1, name: "Todos los productos" })).toBeVisible();
});

test("ficha de producto con precio y datos estructurados", async ({ page }) => {
  const href = await firstProductInStock(page);
  test.skip(!href, "El catálogo aún no tiene productos disponibles.");

  await page.goto(href!);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Agregar al carrito" })).toBeEnabled();
  const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(jsonLd.some((text) => text.includes('"@type":"Product"'))).toBe(true);
  expect(jsonLd.some((text) => text.includes('"@type":"BreadcrumbList"'))).toBe(true);
});

test("carrito y validación del checkout (sin crear pedidos)", async ({ page }) => {
  const href = await firstProductInStock(page);
  test.skip(!href, "El catálogo aún no tiene productos disponibles.");

  await page.goto(href!);
  await expect(cartButton(page)).toHaveAccessibleName("Carrito vacío");
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  await expect(cartButton(page)).toHaveAccessibleName("Carrito: 1 unidad");

  await page.goto("/checkout");
  const confirm = page.getByRole("button", { name: "Confirmar pedido" });
  // Se habilita cuando el servidor confirma precios y stock.
  await expect(confirm).toBeEnabled({ timeout: 15_000 });
  // Formulario vacío: la validación lo detiene antes de llegar al servidor.
  await confirm.click();
  await expect(page.getByText("Escribe tu nombre completo.")).toBeVisible();
  await expect(page.getByText(/Debes autorizar el tratamiento/)).toBeVisible();
  await expect(page).toHaveURL(/\/checkout$/);
});

test("búsqueda sin resultados ofrece salidas", async ({ page }) => {
  await page.goto("/buscar?q=zzzz-sin-resultados");
  await expect(page.getByRole("heading", { name: "No encontramos productos" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver todo el catálogo" })).toBeVisible();
});

test("página inexistente responde 404", async ({ page }) => {
  allowNotFound();
  const response = await page.goto("/esta-pagina-no-existe");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();
});
