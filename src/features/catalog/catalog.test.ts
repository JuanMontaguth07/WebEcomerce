import { describe, expect, it } from "vitest";
import { getAvailability, isDemoProduct } from "./availability";
import {
  buildCatalogQuery,
  EMPTY_FILTERS,
  hasActiveFilters,
  parseCatalogParams,
  toggleSpec,
} from "./params";
import { formatSpecValue, groupSpecs, toCardSpecs } from "./specs";

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
      specs: {},
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

  it("aplica los límites de texto, precio y página", () => {
    const filters = parseCatalogParams({
      q: `  ${"a".repeat(81)}  `,
      min: "1.5",
      max: "1000000001",
      pagina: "501",
    });
    expect(filters).toMatchObject({ q: null, minPrice: null, maxPrice: null, page: 1 });
    expect(
      parseCatalogParams({ q: "  rtx 4070  ", min: " 100 ", max: "0", pagina: "500" }),
    ).toMatchObject({ q: "rtx 4070", minPrice: 0, maxPrice: 100, page: 500 });
    expect(parseCatalogParams({ q: "   ", disponible: "true", oferta: "1" })).toMatchObject({
      q: null,
      inStock: false,
      onSale: true,
    });
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

describe("toCardSpecs", () => {
  const definition = (key: string, position: number, extra: object = {}) => ({
    key,
    label: key,
    group_label: null,
    unit: null,
    data_type: "text" as const,
    position,
    ...extra,
  });
  const value = { value_text: null, value_number: null, value_boolean: null };

  it("respeta el orden de la ficha y arma textos cortos", () => {
    const specs = toCardSpecs([
      { ...value, value_number: 8, definition: definition("Núcleos", 2, { data_type: "number" }) },
      {
        ...value,
        value_number: 12,
        definition: definition("vram", 1, { data_type: "number", unit: "GB" }),
      },
      { ...value, value_text: "GDDR7", definition: definition("memory_type", 3) },
    ]);
    expect(specs.map((spec) => spec.text)).toEqual(["12 GB", "8 núcleos", "GDDR7"]);
  });

  it("un «Sí» muestra la característica, un «No» se omite y corta en 3", () => {
    const yes = (key: string, position: number) => ({
      ...value,
      value_boolean: true,
      definition: definition(key, position, { data_type: "boolean" }),
    });
    const specs = toCardSpecs([
      yes("RGB", 1),
      {
        ...value,
        value_boolean: false,
        definition: definition("WiFi", 2, { data_type: "boolean" }),
      },
      yes("Modular", 3),
      yes("Pasiva", 4),
      yes("Silenciosa", 5),
    ]);
    expect(specs.map((spec) => spec.text)).toEqual(["RGB", "Modular", "Pasiva"]);
  });
});

describe("filtros por especificación en la URL", () => {
  it("lee f_<clave> con uno o varios valores, en minúsculas y sin repetir", () => {
    const filters = parseCatalogParams({ f_socket: ["AM5", "am5", " LGA1851 "], f_vram: "12" });
    expect(filters.specs).toEqual({ socket: ["am5", "lga1851"], vram: ["12"] });
    expect(hasActiveFilters(filters)).toBe(true);
  });

  it("ignora claves inválidas y valores vacíos o demasiado largos", () => {
    const filters = parseCatalogParams({
      "f_Mal-Clave": "x",
      f_: "x",
      f_ok: ["", "a".repeat(81)],
      marca: "kairos",
    });
    expect(filters.specs).toEqual({});
  });

  it("limita cuántas especificaciones y valores se aceptan", () => {
    const many = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`f_k${i}`, "1"]));
    expect(Object.keys(parseCatalogParams(many).specs)).toHaveLength(8);
    const values = Array.from({ length: 20 }, (_, i) => String(i));
    expect(parseCatalogParams({ f_vram: values }).specs.vram).toHaveLength(12);
  });

  it("se serializa como parámetros repetidos y vuelve a leerse igual", () => {
    const query = buildCatalogQuery({
      ...EMPTY_FILTERS,
      specs: { socket: ["lga1851", "am5"], cores: ["8"] },
    });
    expect(query).toBe("?f_cores=8&f_socket=am5&f_socket=lga1851");
    const params = Object.fromEntries(
      [...new URLSearchParams(query).keys()].map((key) => [
        key,
        new URLSearchParams(query).getAll(key),
      ]),
    );
    expect(parseCatalogParams(params).specs).toEqual({ cores: ["8"], socket: ["am5", "lga1851"] });
  });

  it("agrega y quita valores; sin valores, la clave desaparece", () => {
    let specs = toggleSpec({}, "socket", "am5", true);
    specs = toggleSpec(specs, "socket", "lga1851", true);
    expect(specs).toEqual({ socket: ["am5", "lga1851"] });
    specs = toggleSpec(specs, "socket", "am5", false);
    specs = toggleSpec(specs, "socket", "lga1851", false);
    expect(specs).toEqual({});
  });
});
