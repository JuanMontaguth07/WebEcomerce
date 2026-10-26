import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

/** Solo producción en Vercel se indexa; previews y local quedan fuera de buscadores. */
export const allowIndexing = process.env.VERCEL_ENV === "production";

/** URL absoluta del sitio (JSON-LD y sitemap no resuelven rutas relativas). */
export function absoluteUrl(path = "/"): string {
  return new URL(path, siteConfig.url).toString();
}

/** Imagen por defecto al compartir; la genera `app/opengraph-image.tsx`. */
export const DEFAULT_OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: `${siteConfig.name}: ${siteConfig.shortDescription}`,
};

/**
 * Open Graph base. Next.js reemplaza (no combina) `openGraph` cuando una página
 * define el suyo, así que las páginas lo extienden con este objeto, que incluye
 * la imagen por defecto (una página con fotos propias la reemplaza).
 */
export const baseOpenGraph = {
  type: "website",
  siteName: siteConfig.name,
  locale: "es_CO",
  images: [DEFAULT_OG_IMAGE],
} satisfies Metadata["openGraph"];

/** Serializa JSON-LD para un <script>: escapa `<` para que el contenido no cierre la etiqueta. */
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
