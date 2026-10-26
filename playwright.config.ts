import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas de extremo a extremo. Son de solo lectura (no crean pedidos ni cambian
 * datos), así que pueden correr contra producción:
 *   E2E_BASE_URL=https://mi-tienda.vercel.app npm run test:e2e
 * Sin E2E_BASE_URL levantan `next start` sobre el build local (`npm run build` antes).
 */
const externalUrl = process.env.E2E_BASE_URL;
const port = 3100;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // Pocos navegadores a la vez: el servidor recién iniciado responde más lento con muchos.
  workers: process.env.CI ? 2 : 3,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: externalUrl ?? `http://localhost:${port}`,
    locale: "es-CO",
    timezoneId: "America/Bogota",
    trace: "retain-on-failure",
    // En local se usa el Edge instalado; en CI, el Chromium de Playwright.
    channel: process.env.CI ? undefined : (process.env.E2E_CHANNEL ?? "msedge"),
  },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"] } },
    { name: "movil", use: { ...devices["Pixel 7"] } },
  ],
  webServer: externalUrl
    ? undefined
    : {
        command: `npm run start -- --port ${port}`,
        url: `http://localhost:${port}`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
