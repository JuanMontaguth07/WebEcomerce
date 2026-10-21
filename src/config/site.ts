import { publicEnv } from "@/lib/env";

/**
 * Datos de la marca. Los valores marcados como PENDIENTE deben reemplazarse
 * con la información real del negocio antes de publicar.
 */
export const siteConfig = {
  name: "Nombre de la tienda", // PENDIENTE
  shortDescription: "Componentes de PC, hardware y computadores en Colombia.",
  url: publicEnv.NEXT_PUBLIC_SITE_URL,
  locale: "es-CO",
  currency: "COP",
  country: "CO",
} as const;
