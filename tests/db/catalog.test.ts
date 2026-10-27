import { beforeAll, describe, expect, it } from "vitest";
import { asRole, createTestDatabase, one, type TestDatabase } from "./harness";

type Row = {
  name: string;
  slug: string;
  sku: string;
  price: number;
  stock: number;
  category_slug: string;
  brand_slug: string | null;
  total_count: number;
};

let db: TestDatabase;

/** Ejecuta catalog_search como visitante anónimo, igual que el sitio público. */
async function search(params: Record<string, unknown> = {}) {
  const keys = Object.keys(params);
  const args = keys.map((key, index) => `${key} => $${index + 1}`).join(", ");
  const result = await asRole(db, "anon", null, () =>
    db.query<Row>(`select * from public.catalog_search(${args})`, Object.values(params)),
  );
  return result.rows.map((row) => ({
    ...row,
    price: Number(row.price),
    total_count: Number(row.total_count),
  }));
}

beforeAll(async () => {
  db = await createTestDatabase({ seed: true });
}, 60_000);

describe("datos de demostración", () => {
  it("cargan productos marcados como DEMO con inventario trazable", async () => {
    const row = await one<{ total: number; demo: number; inconsistent: number }>(
      db,
      `select count(*)::int total,
              count(*) filter (where sku like 'DEMO-%')::int demo,
              (select count(*)::int from public.products p
                where p.stock <> coalesce((select sum(quantity) from public.inventory_movements m where m.product_id = p.id), 0)) inconsistent
       from public.products`,
    );
    expect(row.total).toBeGreaterThanOrEqual(30);
    expect(row.demo).toBe(row.total);
    expect(row.inconsistent).toBe(0);
  });

  it("no se vuelven a cargar si ya hay productos", async () => {
    await db.exec((await import("node:fs")).readFileSync("supabase/seed.sql", "utf8"));
    const row = await one<{ c: number }>(db, "select count(*)::int c from public.products");
    expect(row.c).toBe(30);
  });
});

describe("catalog_search", () => {
  it("lista todo el catálogo paginado con el total", async () => {
    const page = await search({ p_limit: 10 });
    expect(page).toHaveLength(10);
    expect(page[0]?.total_count).toBe(30);
  });

  it("muestra primero los productos disponibles", async () => {
    const all = await search({ p_limit: 60 });
    const firstOutOfStock = all.findIndex((row) => row.stock === 0);
    expect(all.slice(firstOutOfStock).every((row) => row.stock === 0)).toBe(true);
  });

  it("filtra por categoría, marca, precio y disponibilidad", async () => {
    const gpus = await search({ p_category: "tarjetas-graficas" });
    expect(gpus.every((row) => row.category_slug === "tarjetas-graficas")).toBe(true);
    expect(gpus).toHaveLength(3);

    const kairos = await search({ p_brands: ["kairos"] });
    expect(kairos.every((row) => row.brand_slug === "kairos")).toBe(true);

    const range = await search({ p_min_price: 500000, p_max_price: 1000000 });
    expect(range.every((row) => row.price >= 500000 && row.price <= 1000000)).toBe(true);

    const inStock = await search({ p_in_stock: true, p_limit: 60 });
    expect(inStock.every((row) => row.stock > 0)).toBe(true);
    expect(inStock.length).toBeLessThan(30);
  });

  it("filtra ofertas y computadores armados", async () => {
    const deals = await search({ p_on_sale: true, p_limit: 60 });
    expect(deals.length).toBeGreaterThan(0);
    const prebuilt = await search({ p_product_type: "prebuilt" });
    expect(prebuilt.every((row) => row.category_slug === "computadores")).toBe(true);
  });

  it("ordena por precio", async () => {
    const asc = await search({ p_sort: "price_asc", p_limit: 60 });
    const prices = asc.map((row) => row.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    const desc = await search({ p_sort: "price_desc", p_limit: 1 });
    expect(desc[0]?.price).toBe(Math.max(...prices));
  });

  it("busca sin tildes, por marca, por SKU y con errores de escritura", async () => {
    expect((await search({ p_query: "tarjeta grafica" }))[0]?.category_slug).toBe(
      "tarjetas-graficas",
    );
    expect((await search({ p_query: "helion" })).every((row) => row.brand_slug === "helion")).toBe(
      true,
    );
    expect((await search({ p_query: "DEMO-RAM-D5-32" }))[0]?.sku).toBe("DEMO-RAM-D5-32");
    expect((await search({ p_query: "demo-cpu" })).length).toBe(3);
    expect((await search({ p_query: "refrigeracion liquda" })).length).toBeGreaterThan(0);
  });

  it("devuelve vacío cuando nada coincide", async () => {
    expect(await search({ p_query: "zzzz inexistente" })).toHaveLength(0);
  });

  it("oculta productos inactivos al público", async () => {
    await db.query(`update public.products set is_active = false where sku = 'DEMO-GPU-RG16'`);
    const gpus = await search({ p_category: "tarjetas-graficas" });
    expect(gpus.map((row) => row.sku)).not.toContain("DEMO-GPU-RG16");
    await db.query(`update public.products set is_active = true where sku = 'DEMO-GPU-RG16'`);
  });
});

describe("catalog_facets", () => {
  it("devuelve marcas con conteo y rango de precios", async () => {
    const row = await asRole(db, "anon", null, () =>
      one<{
        f: {
          total: number;
          min_price: number;
          max_price: number;
          brands: { slug: string; count: number }[];
        };
      }>(db, "select public.catalog_facets(p_category => 'memorias-ram') f"),
    );
    expect(row.f.total).toBe(3);
    expect(row.f.brands).toEqual([{ slug: "kairos", name: "Kairos", count: 3 }]);
    expect(row.f.min_price).toBeLessThanOrEqual(row.f.max_price);
  });
});

describe("search_suggestions", () => {
  it("sugiere productos por prefijo, categorías y marcas", async () => {
    const row = await asRole(db, "anon", null, () =>
      one<{
        s: {
          products: { sku: string }[];
          categories: { slug: string }[];
          brands: { slug: string }[];
        };
      }>(db, "select public.search_suggestions('memor') s"),
    );
    expect(row.s.products.length).toBeGreaterThan(0);
    expect(row.s.categories.map((c) => c.slug)).toContain("memorias-ram");
  });

  it("no rompe con caracteres especiales", async () => {
    const row = await asRole(db, "anon", null, () =>
      one<{ s: { products: unknown[] } }>(db, `select public.search_suggestions($1) s`, [
        "':* & | ! ( ) <-> \\",
      ]),
    );
    expect(Array.isArray(row.s.products)).toBe(true);
  });

  it("sugiere marcas por prefijo", async () => {
    const row = await asRole(db, "anon", null, () =>
      one<{ s: { brands: { slug: string }[] } }>(db, "select public.search_suggestions('volt') s"),
    );
    expect(row.s.brands.map((b) => b.slug)).toEqual(["voltaris"]);
  });
});

describe("best_selling_products", () => {
  it("no inventa ventas: sin pedidos no devuelve nada", async () => {
    const result = await asRole(db, "anon", null, () =>
      db.query("select * from public.best_selling_products(8)"),
    );
    expect(result.rows).toHaveLength(0);
  });
});

describe("especificaciones en la tarjeta", () => {
  it("la semilla marca las 3 primeras de cada ficha y el visitante las lee", async () => {
    const rows = await asRole(db, "anon", null, () =>
      db.query<{ slug: string; n: number }>(
        `select c.slug, count(*) filter (where d.show_on_card)::int n
           from public.spec_definitions d join public.categories c on c.id = d.category_id
          group by c.slug`,
      ),
    );
    expect(rows.rows.length).toBeGreaterThan(0);
    for (const row of rows.rows) expect(row.n, row.slug).toBe(3);
  });

  it("una categoría no muestra más de 3", async () => {
    await expect(
      db.query(
        `update public.spec_definitions set show_on_card = true
          where id = (select d.id from public.spec_definitions d
                        join public.categories c on c.id = d.category_id
                       where c.slug = 'tarjetas-graficas' and not d.show_on_card limit 1)`,
      ),
    ).rejects.toThrow(/CARD_SPECS_LIMIT/);
  });
});

describe("logos de marca", () => {
  it("solo aceptan imágenes de la carpeta de marcas", async () => {
    await db.query(
      `update public.brands set logo_path = 'brands/0f8fad5b-d9cb-469f-a165-70867728950e.png'
        where slug = 'kairos'`,
    );
    await expect(
      db.query(`update public.brands set logo_path = 'categories/x.png' where slug = 'kairos'`),
    ).rejects.toThrow(/check constraint/);
  });
});

describe("piezas de Kova Architect", () => {
  it("la semilla asigna la pieza a cada categoría de componentes", async () => {
    const rows = await asRole(db, "anon", null, () =>
      db.query<{ slug: string; architect_part: string | null }>(
        `select slug, architect_part from public.categories order by slug`,
      ),
    );
    const parts = Object.fromEntries(rows.rows.map((row) => [row.slug, row.architect_part]));
    expect(parts).toMatchObject({
      procesadores: "cpu",
      "placas-madre": "motherboard",
      "tarjetas-graficas": "gpu",
      gabinetes: "case",
      monitores: null,
    });
  });

  it("solo acepta piezas conocidas", async () => {
    await expect(
      db.query(`update public.categories set architect_part = 'monitor' where slug = 'monitores'`),
    ).rejects.toThrow(/check constraint/);
  });
});

describe("filtros por especificación", () => {
  type Facet = {
    key: string;
    label: string;
    values: { value: string; label: string | null; count: number }[];
  };

  const facets = (category: string | null, specs: object | null = null) =>
    asRole(db, "anon", null, () =>
      one<{ facets: Facet[] }>(
        db,
        "select public.catalog_spec_facets(p_category => $1, p_specs => $2::jsonb) as facets",
        [category, specs ? JSON.stringify(specs) : null],
      ),
    ).then((row) => row.facets);

  const names = (specs: object, category = "procesadores") =>
    asRole(db, "anon", null, () =>
      db.query<{ name: string; total_count: number }>(
        "select name, total_count from public.catalog_search(p_category => $1, p_specs => $2::jsonb, p_limit => 60)",
        [category, JSON.stringify(specs)],
      ),
    ).then((result) => result.rows);

  it("lista las especificaciones filtrables de la categoría con sus valores y conteos", async () => {
    const result = await facets("procesadores");
    const socket = result.find((facet) => facet.key === "socket");
    expect(socket?.label).toBe("Socket");
    expect(socket?.values.map((item) => item.value).sort()).toEqual(["am5", "lga1851"]);
    expect(socket?.values.find((item) => item.value === "am5")?.label).toBe("AM5");
    const all = await names({});
    const total = socket?.values.reduce((sum, item) => sum + item.count, 0);
    expect(total).toBe(all.length);
  });

  it("dentro de una especificación suma opciones y entre especificaciones las cruza", async () => {
    const amd = await names({ socket: ["AM5"] });
    const intel = await names({ socket: ["lga1851"] });
    const both = await names({ socket: ["am5", "lga1851"] });
    expect(amd.length).toBeGreaterThan(0);
    expect(intel.length).toBeGreaterThan(0);
    expect(both.length).toBe(amd.length + intel.length);
    expect(Number(amd[0]?.total_count)).toBe(amd.length);

    const cores = (await facets("procesadores", { socket: ["am5"] })).find(
      (f) => f.key === "cores",
    );
    const first = cores?.values[0];
    const crossed = await names({ socket: ["am5"], cores: [first?.value] });
    expect(crossed.length).toBe(first?.count);
  });

  it("el conteo de una especificación no se filtra a sí mismo", async () => {
    const socket = (await facets("procesadores", { socket: ["am5"] })).find(
      (f) => f.key === "socket",
    );
    expect(socket?.values.map((item) => item.value).sort()).toEqual(["am5", "lga1851"]);
  });

  it("los números se comparan sin ceros sobrantes", async () => {
    const vram = (await facets("tarjetas-graficas")).find((facet) => facet.key === "vram");
    expect(vram?.values.map((item) => item.value)).toEqual(["8", "12", "16"]);
    expect(await names({ vram: ["12"] }, "tarjetas-graficas")).toHaveLength(1);
  });

  it("ignora filtros mal formados y no inventa resultados", async () => {
    const all = await names({});
    expect(await names({ socket: "am5" })).toHaveLength(all.length);
    expect(await names({ socket: [] })).toHaveLength(all.length);
    expect(await names({ socket: ["no-existe"] })).toHaveLength(0);
    expect(await names({ clave_inexistente: ["x"] })).toHaveLength(0);
  });

  it("sin categoría no hay filtros por especificación", async () => {
    expect(await facets(null)).toEqual([]);
  });
});
