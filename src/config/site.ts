import { publicEnv } from "@/lib/env";

/**
 * Datos de la marca. Contacto, redes y logo definitivo siguen pendientes: no se
 * publican hasta tener la información real del negocio.
 */
export const siteConfig = {
  name: "Kova Studio",
  shortDescription: "Componentes de PC, hardware y computadores en Colombia.",
  url: publicEnv.NEXT_PUBLIC_SITE_URL,
  locale: "es-CO",
  currency: "COP",
  country: "CO",
} as const;
