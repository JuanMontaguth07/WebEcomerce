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
  /** Si es la «PC de la semana»: hasta cuándo (ISO) y su texto. Vencida no llega. */
  spotlightUntil: string | null;
  spotlightNote: string | null;
  components: { kind: PartKind; name: string; price: number | null; available: boolean }[];
};

/** El código de una configuración a partir de su enlace o del código solo. */
export function buildCodeFrom(input: string): string | null {
  const match = /(?:^|\/arma-tu-pc\/)([A-Za-z0-9]{12})(?:[/?#]|$)/.exec(input.trim());
  return match?.[1] ?? null;
}

export type Countdown = { days: number; hours: number; minutes: number; seconds: number };

/** Lo que falta hasta `until` en días, horas, minutos y segundos (null si ya pasó). */
export function countdown(until: string, now: number): Countdown | null {
  let left = Math.floor((Date.parse(until) - now) / 1000);
  if (!Number.isFinite(left) || left <= 0) return null;
  const days = Math.floor(left / 86_400);
  left -= days * 86_400;
  const hours = Math.floor(left / 3_600);
  left -= hours * 3_600;
  const minutes = Math.floor(left / 60);
  return { days, hours, minutes, seconds: left - minutes * 60 };
}

/** La «PC de la semana» vigente, si hay. */
export const spotlightOf = (builds: FeaturedBuild[]) =>
  builds.find((build) => build.spotlightUntil !== null) ?? null;
