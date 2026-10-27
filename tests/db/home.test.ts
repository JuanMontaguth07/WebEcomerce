import { beforeAll, describe, expect, it } from "vitest";
import { asRole, createTestDatabase, one, type TestDatabase } from "./harness";

// Las pruebas de este archivo comparten estado y se ejecutan en orden.
const ADMIN = "00000000-0000-0000-0000-00000000000a";
const CUSTOMER = "00000000-0000-0000-0000-00000000000c";

let db: TestDatabase;
let productId: string;

const asAdmin = <T>(fn: () => Promise<T>) => asRole(db, "authenticated", ADMIN, fn);

beforeAll(async () => {
  db = await createTestDatabase();
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${ADMIN}', 'admin@demo.test', '{"full_name":"Admin Demo"}'),
      ('${CUSTOMER}', 'cliente@demo.test', '{}');
    update public.profiles set role = 'admin' where id = '${ADMIN}';
  `);
  await asAdmin(async () => {
    const category = await one<{ id: string }>(
      db,
      `insert into public.categories (name, slug) values ('Gráficas', 'graficas') returning id`,
    );
    productId = (
      await one<{ id: string }>(
        db,
        `insert into public.products (name, slug, sku, price, category_id, is_active)
         values ('GPU DEMO', 'gpu-demo', 'DEMO-GPU', 2000000, $1, true) returning id`,
        [category.id],
      )
    ).id;
  });
}, 60_000);

describe("anuncios de la portada", () => {
  it("vienen los dos servicios de la tienda, públicos y en orden", async () => {
    const rows = await asRole(db, "anon", null, () =>
      db.query<{ title: string }>(`select title from public.home_banners order by position`),
    );
    expect(rows.rows.map((row) => row.title)).toEqual(["Armamos tu PC", "Te ayudamos a elegir"]);
  });

  it("solo el admin los edita y queda en el historial", async () => {
    await expect(
      asRole(db, "authenticated", CUSTOMER, () =>
        db.query(`update public.home_banners set title = 'Hackeado'`),
      ),
    ).resolves.toMatchObject({ affectedRows: 0 });

    await asAdmin(() =>
      db.query(`update public.home_banners set title = 'Armamos tu PC gamer' where position = 10`),
    );
    const entry = await one<{ entity_label: string; changes: unknown }>(
      db,
      `select entity_label, changes from public.audit_log where entity = 'home_banner'`,
    );
    expect(entry.entity_label).toBe("Armamos tu PC gamer");
    expect(entry.changes).toEqual({
      title: { old: "Armamos tu PC", new: "Armamos tu PC gamer" },
    });
  });

  it("el botón lleva solo a rutas de la tienda y necesita texto y enlace juntos", async () => {
    for (const sql of [
      `update public.home_banners set cta_href = '//otro.sitio' where position = 10`,
      `update public.home_banners set cta_href = 'https://otro.sitio' where position = 10`,
      `update public.home_banners set cta_label = null where position = 10`,
      `update public.home_banners set image_path = 'products/x.png' where position = 10`,
    ]) {
      await expect(
        asAdmin(() => db.query(sql)),
        sql,
      ).rejects.toThrow(/check constraint/);
    }
  });

  it("los visitantes no ven anuncios apagados", async () => {
    await asAdmin(() =>
      db.query(`update public.home_banners set is_active = false where position = 20`),
    );
    const rows = await asRole(db, "anon", null, () =>
      db.query(`select 1 from public.home_banners`),
    );
    expect(rows.rows).toHaveLength(1);
  });
});

describe("piezas únicas", () => {
  it("el admin escribe por qué es única y valida el largo", async () => {
    await asAdmin(() =>
      db.query(`update public.products set unique_note = $1 where id = $2`, [
        "Edición limitada de 500 unidades",
        productId,
      ]),
    );
    const row = await asRole(db, "anon", null, () =>
      one<{ unique_note: string }>(db, `select unique_note from public.products`),
    );
    expect(row.unique_note).toBe("Edición limitada de 500 unidades");
    await expect(
      asAdmin(() =>
        db.query(`update public.products set unique_note = 'x' where id = $1`, [productId]),
      ),
    ).rejects.toThrow(/check constraint/);
  });
});

describe("categorías en bento", () => {
  it("cuenta los productos visibles por categoría principal, sumando subcategorías", async () => {
    await asAdmin(async () => {
      const parent = await one<{ id: string }>(
        db,
        `select id from public.categories where slug = 'graficas'`,
      );
      const child = await one<{ id: string }>(
        db,
        `insert into public.categories (name, slug, parent_id) values ('NVIDIA', 'nvidia', $1) returning id`,
        [parent.id],
      );
      await db.query(
        `insert into public.products (name, slug, sku, price, category_id, is_active) values
           ('GPU NVIDIA DEMO', 'gpu-nvidia-demo', 'DEMO-GPU-N', 3000000, $1, true),
           ('GPU OCULTA DEMO', 'gpu-oculta-demo', 'DEMO-GPU-H', 3000000, $1, false)`,
        [child.id],
      );
    });
    const rows = await asRole(db, "anon", null, () =>
      db.query<{ slug: string; product_count: number }>(
        `select c.slug, x.product_count
           from public.category_product_counts() x
           join public.categories c on c.id = x.category_id`,
      ),
    );
    expect(rows.rows).toEqual([{ slug: "graficas", product_count: 2 }]);
  });

  it("la foto de la categoría solo acepta rutas de su carpeta", async () => {
    const path = "categories/0f8fad5b-d9cb-469f-a165-70867728950e.webp";
    await asAdmin(() =>
      db.query(`update public.categories set image_path = $1 where slug = 'graficas'`, [path]),
    );
    await expect(
      asAdmin(() =>
        db.query(
          `update public.categories set image_path = 'banners/x.webp' where slug = 'graficas'`,
        ),
      ),
    ).rejects.toThrow(/check constraint/);
  });
});
