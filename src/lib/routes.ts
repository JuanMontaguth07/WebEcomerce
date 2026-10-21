import type { Route } from "next";

/**
 * Enlaces internos que pueden pasarse como props. `Route` de Next solo valida
 * literales escritos en <Link>; este tipo además acepta las rutas dinámicas
 * existentes del sitio.
 */
export type AppHref =
  | Route
  | `/categorias/${string}`
  | `/marcas/${string}`
  | `/productos/${string}`
  | `/productos?${string}`
  | `/buscar?${string}`;

export const toRoute = (href: AppHref) => href as Route;
