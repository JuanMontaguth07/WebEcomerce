import { test as base, expect, type Page } from "@playwright/test";

/** `page` que falla la prueba si hay errores de JavaScript o de consola. */
export const test = base.extend({
  // `run` es el `use` de Playwright (renombrado para no confundirlo con un hook de React).
  page: async ({ page }, run, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const allow404 = testInfo.annotations.some((note) => note.type === "allow-404");
      if (allow404 && /status of 404/.test(message.text())) return;
      errors.push(`console: ${message.text()}`);
    });
    await run(page);
    expect(errors, "errores en el navegador").toEqual([]);
  },
});

export { expect };

/** Para pruebas que visitan a propósito una página inexistente. */
export function allowNotFound() {
  test.info().annotations.push({ type: "allow-404" });
}

/** Primer producto disponible del catálogo, o null si aún no hay ninguno. */
export async function firstProductInStock(page: Page): Promise<string | null> {
  await page.goto("/productos?disponible=1");
  const link = page.locator('main article a[href^="/productos/"]').first();
  if (!(await link.count())) return null;
  return link.getAttribute("href");
}
