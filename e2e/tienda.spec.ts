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
  await expect(confirm).toBeEnabled({ timeout: 30_000 });
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

test("el checkout pide la ciudad para calcular el envío", async ({ page }) => {
  const href = await firstProductInStock(page);
  test.skip(!href, "El catálogo aún no tiene productos disponibles.");

  await page.goto(href!);
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  await expect(page.getByRole("banner").getByRole("button", { name: /^Carrito: 1/ })).toBeVisible();
  await page.goto("/checkout");
  const shipping = page.locator("dt:text-is('Envío') + dd").first();
  await expect(shipping).toHaveText("Elige tu ciudad");
  await page.getByLabel("Departamento").selectOption({ index: 1 });
  await page.getByLabel("Ciudad o municipio").fill("Ciudad de prueba");
  // Con o sin tarifa configurada, deja de pedir la ciudad.
  await expect(shipping).not.toHaveText(/Elige tu ciudad|Calculando/, { timeout: 10_000 });
});

test("arma tu PC: avisa la incompatibilidad y no vende piezas demo", async ({ page }) => {
  await page.goto("/arma-tu-pc");
  await expect(page.getByRole("heading", { level: 1, name: "Arma tu PC" })).toBeVisible();
  const demo = page.getByRole("button", { name: "Piezas demo" });
  if ((await demo.getAttribute("aria-pressed")) !== "true") await demo.click();
  await page.getByRole("button", { name: "Libre", exact: true }).click();

  const slots = page.getByRole("navigation", { name: "Piezas del equipo" });
  const choose = async (slot: RegExp, name: string) => {
    await slots.getByRole("button", { name: slot }).click();
    await page.getByRole("article", { name }).getByRole("button", { name: "Elegir" }).click();
  };
  await choose(/Procesador/, "Procesador demo 20 núcleos LGA1851");
  await page.getByRole("checkbox", { name: "Solo compatibles" }).click();
  await choose(/Placa madre/, "Placa demo X870 ATX");

  // En escritorio el resumen está a la vista; en celular se abre desde la barra.
  const bar = page.getByRole("button", { name: "Ver resumen" });
  if (await bar.isVisible()) await bar.click();
  const summary = page
    .getByRole("dialog", { name: "Resumen del equipo" })
    .or(page.getByRole("complementary", { name: "Resumen del equipo" }));
  await expect(summary.getByText("El procesador usa socket LGA1851 y la placa AM5")).toBeVisible();
  await expect(summary.getByRole("button", { name: "Agregar todo al carrito" })).toBeDisabled();
});

test("arma tu PC guiado: recomienda un equipo y lo abre en modo libre", async ({ page }) => {
  await page.goto("/arma-tu-pc");
  const demo = page.getByRole("button", { name: "Piezas demo" });
  if ((await demo.getAttribute("aria-pressed")) !== "true") await demo.click();

  await page.getByText("Jugar", { exact: true }).click();
  const next = page.getByRole("button", { name: "Siguiente" });
  // Uso elegido; presupuesto, resolución, marca y prioridad con sus valores por defecto.
  for (let step = 0; step < 5; step += 1) await next.click();
  await page.getByText("No, solo la torre").click();
  await page.getByRole("button", { name: "Ver mi recomendación" }).click();

  await expect(page.getByRole("heading", { name: "Tu equipo recomendado" })).toBeVisible();
  await expect(page.getByText(/Se lleva el \d+ % del presupuesto porque para jugar/)).toBeVisible();
  await page.getByRole("button", { name: "Ajustar en modo libre" }).click();
  await expect(page.getByRole("navigation", { name: "Piezas del equipo" })).toContainText("8 de 8");
});
