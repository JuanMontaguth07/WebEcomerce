import type { FullConfig } from "@playwright/test";

/** Páginas que casi todas las pruebas tocan primero. */
const WARM_PATHS = ["/", "/productos", "/arma-tu-pc", "/carrito", "/checkout"];

/**
 * Precalienta el servidor antes de las pruebas: recién iniciado, la primera
 * visita a cada página la arma y la guarda en caché, y con varios navegadores
 * a la vez eso puede tardar más que la espera de una prueba. Solo lee.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) return;
  for (const path of WARM_PATHS) {
    try {
      await fetch(new URL(path, baseURL), { signal: AbortSignal.timeout(30_000) });
    } catch {
      // Si una no responde, la prueba que la usa dirá por qué.
    }
  }
}
