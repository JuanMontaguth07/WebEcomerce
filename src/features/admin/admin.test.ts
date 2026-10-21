import { describe, expect, it } from "vitest";
import {
  brandSchema,
  categorySchema,
  productSchema,
  specDefinitionSchema,
} from "./catalog-schemas";
import { sanitizeSearch } from "./shared";

const categoryId = "11111111-1111-4111-8111-111111111111";

const product = {
  name: "Tarjeta gráfica X",
  slug: "tarjeta-grafica-x",
  sku: " gpu-x-12 ",
  productType: "component",
  categoryId,
  brandId: "",
  price: "2849900",
  compareAtPrice: "",
  lowStockThreshold: "3",
  warrantyMonths: "",
  shortDescription: "",
  description: "",
  isActive: true,
  isFeatured: false,
  seoTitle: "",
  seoDescription: "",
} as const;

describe("productSchema", () => {
  it("normaliza valores del formulario", () => {
    const parsed = productSchema.parse(product);
    expect(parsed.sku).toBe("GPU-X-12");
    expect(parsed.price).toBe(2849900);
    expect(parsed.brandId).toBeNull();
    expect(parsed.compareAtPrice).toBeNull();
    expect(parsed.warrantyMonths).toBeNull();
    expect(parsed.shortDescription).toBeNull();
  });

  it("rechaza precio anterior menor o igual, precios con decimales y slugs inválidos", () => {
    const cases = [
      { compareAtPrice: "100" },
      { price: "1500.5" },
      { price: "0" },
      { slug: "Con Espacios" },
      { categoryId: "" },
    ];
    for (const patch of cases) {
      expect(productSchema.safeParse({ ...product, ...patch }).success, JSON.stringify(patch)).toBe(
        false,
      );
    }
  });
});

describe("otros esquemas del panel", () => {
  it("valida categorías, marcas y especificaciones", () => {
    expect(
      categorySchema.safeParse({
        name: "GPU",
        slug: "gpu",
        parentId: "",
        position: "1",
        isActive: true,
      }).success,
    ).toBe(true);
    expect(brandSchema.safeParse({ name: "X", slug: "Marca X", isActive: true }).success).toBe(
      false,
    );
    expect(
      specDefinitionSchema.safeParse({
        categoryId,
        key: "Memoria Video",
        label: "Memoria",
        dataType: "number",
        isFilterable: false,
        position: 0,
      }).success,
    ).toBe(false);
  });
});

describe("sanitizeSearch", () => {
  it("elimina caracteres que alteran los filtros de PostgREST", () => {
    expect(sanitizeSearch("juan,(status.eq.paid)")).toBe("juan status.eq.paid");
    expect(sanitizeSearch("  %_  ")).toBeUndefined();
    expect(sanitizeSearch("#1005")).toBe("#1005");
  });
});
