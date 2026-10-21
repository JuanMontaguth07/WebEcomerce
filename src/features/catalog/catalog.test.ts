import { describe, expect, it } from "vitest";
import { getAvailability, isDemoProduct } from "./availability";
import { buildCatalogQuery, EMPTY_FILTERS, hasActiveFilters, parseCatalogParams } from "./params";
import { formatSpecValue, groupSpecs } from "./specs";

describe("parseCatalogParams", () => {
  it("usa valores por defecto sin parámetros", () => {
    expect(parseCatalogParams({})).toEqual(EMPTY_FILTERS);
  });

  it("lee filtros válidos de la URL", () => {
    expect(
      parseCatalogParams({
        q: "  rtx ",
        marca: "voltaris,arcanum,voltaris",
        min: "500000",
        max: "3000000",
        disponible: "1",
        oferta: "1",
        orden: "price_asc",
        pagina: "3",
      }),
    ).toEqual({
      q: "rtx",
      category: null,
      brands: ["arcanum", "voltaris"],
      minPrice: 500000,
      maxPrice: 3000000,
      inStock: true,
      onSale: true,
      sort: "price_asc",
      page: 3,
    });
  });

  it("ignora valores inválidos o maliciosos", () => {
    const filters = parseCatalogParams({
      marca: "Bad Slug,ok-slug,<script>",
      min: "-5",
      max: "abc",
      orden: "drop table",
      pagina: "0",
      categoria: "../etc",
    });
    expect(filters.brands).toEqual(["ok-slug"]);
    expect(filters.minPrice).toBeNull();
    expect(filters.maxPrice).toBeNull();
    expect(filters.sort).toBe("relevance");
    expect(filters.page).toBe(1);
    expect(filters.category).toBeNull();
  });

  it("intercambia mínimo y máximo si llegan invertidos", () => {
    const filters = parseCatalogParams({ min: "900", max: "100" });
    expect([filters.minPrice, filters.maxPrice]).toEqual([100, 900]);
  });

  it("toma el primer valor cuando un parámetro se repite", () => {
    expect(parseCatalogParams({ q: ["uno", "dos"] }).q).toBe("uno");
  });
});

describe("buildCatalogQuery", () => {
  it("omite valores por defecto", () => {
    expect(buildCatalogQuery(EMPTY_FILTERS)).toBe("");
  });

  it("es el inverso de parseCatalogParams", () => {
    const query = buildCatalogQuery(EMPTY_FILTERS, {
      q: "ssd nvme",
      brands: ["kairos"],
      minPrice: 100000,
      inStock: true,
      sort: "price_desc",
      page: 2,
    });
    const params = Object.fromEntries(new URLSearchParams(query.slice(1)));
    expect(parseCatalogParams(params)).toMatchObject({
      q: "ssd nvme",
      brands: ["kairos"],
      minPrice: 100000,
      inStock: true,
      sort: "price_desc",
      page: 2,
    });
  });

  it("detecta filtros activos", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, onSale: true })).toBe(true);
  });
});

describe("getAvailability", () => {
  it("distingue agotado, stock bajo y disponible", () => {
    expect(getAvailability(0, 3).status).toBe("out_of_stock");
    expect(getAvailability(1, 3)).toEqual({ status: "low_stock", label: "Queda 1 unidad" });
    expect(getAvailability(3, 3).label).toBe("Quedan 3 unidades");
    expect(getAvailability(4, 3).status).toBe("in_stock");
  });

  it("reconoce productos de demostración", () => {
    expect(isDemoProduct("DEMO-GPU-VX12")).toBe(true);
    expect(isDemoProduct("GPU-VX12")).toBe(false);
  });
});

describe("formatSpecValue", () => {
  const value = (v: Partial<{ text: string; number: number; boolean: boolean }>) => ({
    text: v.text ?? null,
    number: v.number ?? null,
    boolean: v.boolean ?? null,
  });

  it("formatea números con unidad y decimales en español", () => {
    expect(formatSpecValue("number", value({ number: 5.3 }), "GHz")).toBe("5,3 GHz");
    expect(formatSpecValue("number", value({ number: 2000 }), "GB")).toBe("2 TB");
    expect(formatSpecValue("number", value({ number: 16 }), null)).toBe("16");
  });

  it("formatea booleanos y texto", () => {
    expect(formatSpecValue("boolean", value({ boolean: true }), null)).toBe("Sí");
    expect(formatSpecValue("text", value({ text: "AM5" }), null)).toBe("AM5");
  });

  it("agrupa conservando el orden", () => {
    const groups = groupSpecs([
      { key: "a", label: "A", group: "Memoria", value: "1" },
      { key: "b", label: "B", group: "Energía", value: "2" },
      { key: "c", label: "C", group: "Memoria", value: "3" },
    ]);
    expect(groups.map((g) => [g.group, g.items.length])).toEqual([
      ["Memoria", 2],
      ["Energía", 1],
    ]);
  });
});
