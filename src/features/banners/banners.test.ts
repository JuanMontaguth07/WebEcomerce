import { describe, expect, it } from "vitest";
import { describeActivity } from "@/features/activity/format";
import { productSchema } from "@/features/admin/catalog-schemas";
import { bannerSchema } from "./schemas";

const valid = {
  eyebrow: " Asesoría ",
  title: "Te ayudamos a elegir",
  body: "",
  ctaLabel: "Hablar con nosotros",
  ctaHref: "/soporte",
  imagePath: null,
  illustration: "support",
  isActive: true,
};

describe("bannerSchema", () => {
  it("normaliza textos vacíos a null", () => {
    expect(bannerSchema.parse(valid)).toMatchObject({ eyebrow: "Asesoría", body: null });
  });

  it("exige botón completo, enlace interno e imagen en banners/", () => {
    const fails = [
      { ctaHref: "" },
      { ctaLabel: "" },
      { ctaHref: "//otro.sitio" },
      { ctaHref: "https://otro.sitio" },
      { imagePath: "products/x.png" },
      { illustration: "cohete" },
      { title: "Ok" },
    ];
    for (const overrides of fails) {
      expect(
        bannerSchema.safeParse({ ...valid, ...overrides }).success,
        JSON.stringify(overrides),
      ).toBe(false);
    }
    expect(bannerSchema.safeParse({ ...valid, ctaLabel: "", ctaHref: "" }).success).toBe(true);
    expect(
      bannerSchema.safeParse({
        ...valid,
        imagePath: "banners/8a6e0804-2bd0-4672-b79d-d97027f9071a.webp",
      }).success,
    ).toBe(true);
  });

  it("se describe en el historial", () => {
    expect(
      describeActivity({
        id: 1,
        occurredAt: "2026-10-30T12:00:00Z",
        actorId: "u1",
        actorLabel: "Juan",
        entity: "home_banner",
        action: "create",
        entityId: "b1",
        entityLabel: "Armamos tu PC",
        changes: null,
        reason: null,
      }),
    ).toBe("creó el anuncio «Armamos tu PC» de la portada");
  });
});

describe("pieza única en el producto", () => {
  const product = {
    name: "GPU DEMO",
    slug: "gpu-demo",
    sku: "DEMO-GPU",
    productType: "component",
    categoryId: "8a6e0804-2bd0-4672-b79d-d97027f9071a",
    price: "100000",
    lowStockThreshold: "3",
    isActive: true,
    isFeatured: false,
  };

  it("vacía es null, muy corta se rechaza", () => {
    expect(productSchema.parse({ ...product, uniqueNote: "  " }).uniqueNote).toBeNull();
    expect(productSchema.safeParse({ ...product, uniqueNote: "ab" }).success).toBe(false);
    expect(productSchema.parse({ ...product, uniqueNote: "Edición limitada" }).uniqueNote).toBe(
      "Edición limitada",
    );
  });
});
