import type { PartKind } from "@/features/compatibility/types";

export const FEATURED_BUILDS_TAG = "featured-builds";

/** Una PC ya armada que la tienda recomienda, lista para abrir en el configurador. */
export type FeaturedBuild = {
  id: string;
  title: string;
  tag: string | null;
  description: string | null;
  /** Código de la configuración: /arma-tu-pc/<code>. */
  code: string;
  source: "catalog" | "demo";
  /** Total con los precios de hoy (en las de referencia, la oferta más barata). */
  total: number;
  /** Piezas sin ningún precio conocido: no suman al total. */
  unpriced: number;
  components: { kind: PartKind; name: string; price: number | null; available: boolean }[];
};

/** El código de una configuración a partir de su enlace o del código solo. */
export function buildCodeFrom(input: string): string | null {
  const match = /(?:^|\/arma-tu-pc\/)([A-Za-z0-9]{12})(?:[/?#]|$)/.exec(input.trim());
  return match?.[1] ?? null;
}
