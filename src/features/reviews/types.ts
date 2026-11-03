export const STORE_REVIEWS_TAG = "store-reviews";

/** Una opinión publicada (sin datos del pedido). */
export type PublishedReview = {
  id: string;
  rating: number;
  body: string;
  displayName: string;
  city: string | null;
  createdAt: string;
};

export type ReviewSummary = { count: number; average: number | null; items: PublishedReview[] };

export type ReviewStatus = "pending" | "approved" | "rejected";

/** La opinión de un pedido, como la ve su comprador. */
export type OrderReview = {
  rating: number;
  body: string;
  displayName: string;
  showCity: boolean;
  status: ReviewStatus;
};

/** «Laura Martínez» → «Laura M.»: lo que se sugiere mostrar, sin el apellido completo. */
export function suggestedName(fullName: string): string {
  const [first = "", second = ""] = fullName.trim().split(/\s+/);
  const name = first.charAt(0).toLocaleUpperCase("es-CO") + first.slice(1);
  return second ? `${name} ${second.charAt(0).toLocaleUpperCase("es-CO")}.` : name;
}
