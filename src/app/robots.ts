import type { MetadataRoute } from "next";
import { absoluteUrl, allowIndexing } from "@/lib/seo";

/**
 * Fuera de producción no se rastrea nada. En producción se excluyen las páginas
 * privadas o sin valor para buscadores (panel, sesión, carrito, pedidos y
 * resultados de búsqueda); los listados filtrados se rastrean pero llevan noindex.
 */
export default function robots(): MetadataRoute.Robots {
  if (!allowIndexing) return { rules: { userAgent: "*", disallow: "/" } };

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/",
        "/auth/",
        "/ingresar",
        "/carrito",
        "/checkout",
        "/pedido/",
        "/buscar",
        "/sistema-diseno",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
