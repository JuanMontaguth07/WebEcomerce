import type { OfferCurrency, OfferStore, ProductOffer } from "./stores";

/** Fila de product_offers al formato de la app. */
export function toOffer(row: {
  id: string;
  store: string;
  store_name: string | null;
  url: string;
  price: number | null;
  currency: string;
  note: string | null;
  checked_at: string;
}): ProductOffer {
  return {
    id: row.id,
    store: row.store as OfferStore,
    storeName: row.store_name,
    url: row.url,
    price: row.price === null ? null : Number(row.price),
    currency: row.currency as OfferCurrency,
    note: row.note,
    checkedAt: row.checked_at,
  };
}
