import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://tienda.example";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proyecto.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_clave_de_prueba";
});

const { breadcrumbJsonLd, productJsonLd } = await import("./structured-data");
const { serializeJsonLd } = await import("@/lib/seo");
type ProductDetail = import("./types").ProductDetail;

const product: ProductDetail = {
  id: "p1",
  name: "Tarjeta gráfica X",
  slug: "tarjeta-grafica-x",
  sku: "GPU-X-12",
  productType: "component",
  shortDescription: null,
  description: "Primer párrafo.\n\nSegundo párrafo.",
  price: 2849900,
  compareAtPrice: null,
  stock: 2,
  lowStockThreshold: 3,
  brand: { name: "Marca", slug: "marca" },
  category: { name: "Tarjetas gráficas", slug: "tarjetas-graficas" },
  parentCategory: null,
  image: null,
  rarity: null,
  uniqueNote: null,
  flag: null,
  images: [{ id: "i1", path: "products/p1/a.webp", alt: "Frente", width: 800, height: 800 }],
  specs: [],
  warrantyMonths: 12,
  keySpecs: [],
  seoTitle: null,
  seoDescription: null,
  updatedAt: "2026-10-01T00:00:00Z",
};

describe("productJsonLd", () => {
  it("publica precio en COP, disponibilidad real y URLs absolutas", () => {
    const data = productJsonLd(product);
    expect(data.url).toBe("https://tienda.example/productos/tarjeta-grafica-x");
    expect(data.description).toBe("Primer párrafo.");
    expect(data.image).toEqual([
      "https://proyecto.supabase.co/storage/v1/object/public/catalog/products/p1/a.webp",
    ]);
    expect(data.offers).toMatchObject({
      priceCurrency: "COP",
      price: 2849900,
      availability: "https://schema.org/LimitedAvailability",
    });
  });

  it("omite lo que el producto no tiene y marca agotados", () => {
    const data = productJsonLd({
      ...product,
      brand: null,
      images: [],
      stock: 0,
      description: null,
    });
    expect(data).not.toHaveProperty("brand");
    expect(data).not.toHaveProperty("image");
    expect(data).not.toHaveProperty("description");
    expect(data.offers.availability).toBe("https://schema.org/OutOfStock");
  });
});

describe("breadcrumbJsonLd", () => {
  it("numera los elementos y deja sin enlace la página actual", () => {
    const data = breadcrumbJsonLd([{ name: "Inicio", href: "/" }, { name: "Producto" }]);
    expect(data.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Inicio", item: "https://tienda.example/" },
      { "@type": "ListItem", position: 2, name: "Producto" },
    ]);
  });
});

describe("serializeJsonLd", () => {
  it("no permite cerrar la etiqueta script desde los datos", () => {
    expect(serializeJsonLd({ name: "</script><script>alert(1)</script>" })).not.toContain("<");
  });
});
