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
  /** Total con los precios de hoy. */
  total: number;
  components: { kind: PartKind; name: string; price: number; available: boolean }[];
};

/** El código de una configuración a partir de su enlace o del código solo. */
export function buildCodeFrom(input: string): string | null {
  const match = /(?:^|\/arma-tu-pc\/)([A-Za-z0-9]{12})(?:[/?#]|$)/.exec(input.trim());
  return match?.[1] ?? null;
}
