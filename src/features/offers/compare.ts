import type { ArchitectPart } from "@/features/architect/types";
import { storeLabel, type ProductOffer } from "./stores";

/** Una forma de conseguir la pieza: en la tienda o en otra, con su precio en pesos si se sabe. */
export type PriceOption =
  | { source: "here"; label: string; cop: number; inStock: boolean }
  | { source: "offer"; label: string; cop: number | null; offer: ProductOffer };

/** Precio de una oferta en pesos (las de dólares, con la tasa de la tienda). */
export function offerInCop(offer: ProductOffer, rate: number | null): number | null {
  if (offer.price === null) return null;
  if (offer.currency === "COP") return offer.price;
  return rate ? Math.round(offer.price * rate) : null;
}

export type PartPricing = {
  /** En esta tienda (null si no se vende aquí: demo o referencia). */
  here: Extract<PriceOption, { source: "here" }> | null;
  /** En otras tiendas, de la más barata a la más cara (las sin precio al final). */
  offers: Extract<PriceOption, { source: "offer" }>[];
  /** La opción más barata que se puede comprar ya (aquí solo cuenta si hay stock). */
  cheapest: PriceOption | null;
};

export function partPricing(part: ArchitectPart, rate: number | null): PartPricing {
  const here =
    part.demo || part.reference
      ? null
      : {
          source: "here" as const,
          label: "Disponible aquí",
          cop: part.price,
          inStock: (part.stock ?? 0) > 0,
        };
  const offers = part.offers
    .map((offer) => ({
      source: "offer" as const,
      label: storeLabel(offer),
      cop: offerInCop(offer, rate),
      offer,
    }))
    .sort((a, b) => (a.cop ?? Infinity) - (b.cop ?? Infinity));
  const candidates: PriceOption[] = [
    ...(here?.inStock ? [here] : []),
    ...offers.filter((option) => option.cop !== null),
  ];
  // Ante un empate, gana comprar aquí.
  const cheapest = candidates.reduce<PriceOption | null>(
    (best, option) => (!best || (option.cop ?? Infinity) < (best.cop ?? Infinity) ? option : best),
    null,
  );
  return { here, offers, cheapest };
}

/** El precio a mostrar y ordenar: el de aquí, o el más barato afuera si no se vende aquí. */
export function displayPrice(part: ArchitectPart, rate: number | null): number {
  if (part.demo || !part.reference) return part.price;
  const best = partPricing(part, rate).offers.find((option) => option.cop !== null);
  return best?.cop ?? part.price;
}

export type BuildPricing = {
  /** Lo que se compra en esta tienda (con stock). */
  here: { total: number; count: number };
  /** Lo más barato de cada pieza, aquí o afuera. */
  best: { total: number; count: number };
  /** Piezas sin ningún precio conocido para comprar (ni aquí ni en ofertas). */
  unpriced: number;
  /** Cuánto cuesta de más comprar aquí las piezas que también tienen oferta más barata. */
  savings: number;
};

/** Totales del equipo: comprando aquí y combinando lo más barato de cada tienda. */
export function buildPricing(parts: ArchitectPart[], rate: number | null): BuildPricing {
  const result: BuildPricing = {
    here: { total: 0, count: 0 },
    best: { total: 0, count: 0 },
    unpriced: 0,
    savings: 0,
  };
  for (const part of parts) {
    if (part.demo) continue;
    const pricing = partPricing(part, rate);
    if (pricing.here?.inStock) {
      result.here.total += pricing.here.cop;
      result.here.count += 1;
    }
    if (pricing.cheapest?.cop != null) {
      result.best.total += pricing.cheapest.cop;
      result.best.count += 1;
      if (pricing.here?.inStock) result.savings += pricing.here.cop - pricing.cheapest.cop;
    } else {
      result.unpriced += 1;
    }
  }
  return result;
}
