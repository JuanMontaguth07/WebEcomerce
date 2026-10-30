/**
 * Tiendas donde se puede conseguir una pieza. Las ofertas (enlace y precio) las
 * carga el admin: estas tiendas no dejan consultar precios automáticamente.
 * Las búsquedas son enlaces a la búsqueda pública de cada sitio.
 */

export const OFFER_STORES = {
  amazon: { label: "Amazon" },
  mercadolibre: { label: "MercadoLibre" },
  alkosto: { label: "Alkosto" },
  ktronix: { label: "Ktronix" },
  falabella: { label: "Falabella" },
  exito: { label: "Éxito" },
  newegg: { label: "Newegg" },
  other: { label: "Otra tienda" },
} as const;

export type OfferStore = keyof typeof OFFER_STORES;
export const OFFER_STORE_KEYS = Object.keys(OFFER_STORES) as OfferStore[];

export type OfferCurrency = "COP" | "USD";

export type ProductOffer = {
  id: string;
  store: OfferStore;
  /** Nombre visible si la tienda es «otra». */
  storeName: string | null;
  url: string;
  price: number | null;
  currency: OfferCurrency;
  note: string | null;
  /** Fecha (AAAA-MM-DD) en que el admin revisó el precio. */
  checkedAt: string;
};

export function storeLabel(offer: Pick<ProductOffer, "store" | "storeName">): string {
  return offer.store === "other"
    ? (offer.storeName ?? "Otra tienda")
    : OFFER_STORES[offer.store].label;
}

/** Búsquedas automáticas de una pieza (sin precio): siempre al día y sin mantenimiento. */
export function searchLinks(query: string): { label: string; url: string }[] {
  const text = query.trim();
  const slug = text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return [
    { label: "Amazon", url: `https://www.amazon.com/s?k=${encodeURIComponent(text)}` },
    { label: "MercadoLibre", url: `https://listado.mercadolibre.com.co/${slug}` },
    {
      label: "Google Shopping",
      url: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(text)}`,
    },
  ];
}

/** Días desde que se revisó el precio (para «revisado hace 3 días»). */
export function daysSince(date: string, now: number): number {
  return Math.max(0, Math.floor((now - Date.parse(`${date}T12:00:00-05:00`)) / 86_400_000));
}
