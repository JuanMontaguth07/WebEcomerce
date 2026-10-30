import { describe, expect, it } from "vitest";
import type { ArchitectPart } from "@/features/architect/types";
import { buildPricing, displayPrice, offerInCop, partPricing } from "./compare";
import { daysSince, searchLinks, type ProductOffer } from "./stores";

const offer = (patch: Partial<ProductOffer>): ProductOffer => ({
  id: "o",
  store: "mercadolibre",
  storeName: null,
  url: "https://example.com",
  price: 2_000_000,
  currency: "COP",
  note: null,
  checkedAt: "2026-10-28",
  ...patch,
});

const part = (patch: Partial<ArchitectPart>): ArchitectPart => ({
  id: "p",
  kind: "gpu",
  name: "RTX 5060 Ti",
  brand: null,
  price: 2_300_000,
  stock: 3,
  lowStockThreshold: 1,
  slug: "rtx",
  image: null,
  demo: false,
  reference: false,
  offers: [],
  specs: {},
  details: [],
  keySpecs: [],
  ...patch,
});

describe("precios en otras tiendas", () => {
  it("pasa dólares a pesos con la tasa (y sin tasa no inventa)", () => {
    expect(offerInCop(offer({ price: 429, currency: "USD" }), 4150)).toBe(1_780_350);
    expect(offerInCop(offer({ price: 429, currency: "USD" }), null)).toBeNull();
    expect(offerInCop(offer({ price: null }), 4150)).toBeNull();
  });

  it("elige lo más barato que se puede comprar, y ante empate gana aquí", () => {
    const pricing = partPricing(
      part({
        offers: [
          offer({ id: "a", store: "amazon", price: 600, currency: "USD" }),
          offer({ id: "m", price: 2_100_000 }),
        ],
      }),
      4000,
    );
    expect(pricing.offers.map((option) => option.label)).toEqual(["MercadoLibre", "Amazon"]);
    expect(pricing.cheapest).toMatchObject({ source: "offer", label: "MercadoLibre" });
    const tie = partPricing(part({ offers: [offer({ price: 2_300_000 })] }), null);
    expect(tie.cheapest?.source).toBe("here");
  });

  it("agotado aquí no cuenta como opción para comprar", () => {
    const pricing = partPricing(part({ stock: 0, offers: [offer({ price: 2_500_000 })] }), null);
    expect(pricing.here?.inStock).toBe(false);
    expect(pricing.cheapest).toMatchObject({ source: "offer", cop: 2_500_000 });
  });

  it("una pieza de referencia se muestra con su oferta más barata", () => {
    const reference = part({ reference: true, stock: 0, offers: [offer({ price: 1_950_000 })] });
    expect(partPricing(reference, null).here).toBeNull();
    expect(displayPrice(reference, null)).toBe(1_950_000);
  });

  it("suma el equipo comprando aquí y combinando lo más barato", () => {
    const result = buildPricing(
      [
        part({ id: "a", offers: [offer({ price: 2_000_000 })] }),
        part({ id: "b", kind: "cpu", price: 1_000_000 }),
        part({
          id: "c",
          kind: "ram",
          reference: true,
          stock: 0,
          offers: [offer({ price: 500_000 })],
        }),
        part({ id: "d", kind: "psu", reference: true, stock: 0 }),
      ],
      null,
    );
    expect(result).toEqual({
      here: { total: 3_300_000, count: 2 },
      best: { total: 3_500_000, count: 3 },
      unpriced: 1,
      savings: 300_000,
    });
  });

  it("arma búsquedas y cuenta los días desde la revisión", () => {
    expect(searchLinks("RTX 5060 Ti 16 GB")[1]?.url).toBe(
      "https://listado.mercadolibre.com.co/rtx-5060-ti-16-gb",
    );
    expect(daysSince("2026-10-27", Date.parse("2026-10-30T15:00:00Z"))).toBe(3);
  });
});
