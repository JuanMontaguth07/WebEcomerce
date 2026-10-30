import { beforeAll, describe, expect, it } from "vitest";
import { asRole, createTestDatabase, one, type TestDatabase } from "./harness";

const ADMIN = "00000000-0000-0000-0000-00000000000a";

let db: TestDatabase;
let reference: string;
let hidden: string;

const customer = {
  name: "Cliente Demo",
  email: "comprador@demo.test",
  phone: "+57 300 123 4567",
  department: "Cundinamarca",
  city: "Bogotá",
  address: "Calle 1 # 2-3",
  data_consent: true,
};

beforeAll(async () => {
  db = await createTestDatabase();
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data)
    values ('${ADMIN}', 'admin@demo.test', '{"full_name":"Admin Demo"}');
    update public.profiles set role = 'admin' where id = '${ADMIN}';
  `);
  await asRole(db, "authenticated", ADMIN, async () => {
    const category = await one<{ id: string }>(
      db,
      `insert into public.categories (name, slug) values ('Gráficas', 'graficas') returning id`,
    );
    reference = (
      await one<{ id: string }>(
        db,
        `insert into public.products (name, slug, sku, price, category_id, is_reference)
         values ('RTX 5060 Ti 16 GB', 'rtx-5060-ti', 'REF-5060TI', 2300000, $1, true) returning id`,
        [category.id],
      )
    ).id;
    hidden = (
      await one<{ id: string }>(
        db,
        `insert into public.products (name, slug, sku, price, category_id)
         values ('Borrador', 'borrador', 'BORRADOR-1', 100000, $1) returning id`,
        [category.id],
      )
    ).id;
  });
}, 60_000);

describe("piezas de referencia", () => {
  it("no pueden estar visibles en la tienda", async () => {
    await expect(
      asRole(db, "authenticated", ADMIN, () =>
        db.query("update public.products set is_active = true where id = $1", [reference]),
      ),
    ).rejects.toThrow(/products_reference_hidden/);
  });

  it("el público las lee (para Arma tu PC), pero un borrador oculto sigue oculto", async () => {
    const rows = await asRole(db, "anon", null, () =>
      db.query<{ id: string }>("select id from public.products where id = any($1)", [
        [reference, hidden],
      ]),
    );
    expect(rows.rows.map((row) => row.id)).toEqual([reference]);
  });

  it("no se pueden pedir", async () => {
    await expect(
      asRole(db, "anon", null, () =>
        db.query("select * from public.create_order($1, $2)", [
          customer,
          [{ product_id: reference, quantity: 1 }],
        ]),
      ),
    ).rejects.toThrow();
  });
});

describe("armados con piezas de referencia", () => {
  it("se guardan con el precio de referencia de la base", async () => {
    const code = await asRole(db, "anon", null, () =>
      one<{ code: string }>(db, "select public.save_build($1::jsonb) as code", [
        JSON.stringify({
          name: "Con referencia",
          mode: "free",
          source: "catalog",
          components: [{ kind: "gpu", product_id: reference, name: "Truco", price: 1 }],
        }),
      ]),
    ).then((row) => row.code);
    const build = await asRole(db, "anon", null, () =>
      one<{ build: { total: number } }>(db, "select public.get_build($1) as build", [code]),
    );
    expect(Number(build.build.total)).toBe(2_300_000);
  });

  it("un borrador oculto (no referencia) sigue sin poder usarse", async () => {
    await expect(
      asRole(db, "anon", null, () =>
        db.query("select public.save_build($1::jsonb)", [
          JSON.stringify({
            name: "Oculto",
            mode: "free",
            source: "catalog",
            components: [{ kind: "gpu", product_id: hidden }],
          }),
        ]),
      ),
    ).rejects.toThrow(/PRODUCT_UNAVAILABLE/);
  });
});

describe("ofertas en otras tiendas", () => {
  it("el admin las carga y el público las ve con la pieza", async () => {
    await asRole(db, "authenticated", ADMIN, () =>
      db.query(
        `insert into public.product_offers (product_id, store, url, price, currency, note)
         values ($1, 'amazon', 'https://www.amazon.com/dp/B0EJEMPLO', 429, 'USD', '+ envío internacional'),
                ($1, 'mercadolibre', 'https://articulo.mercadolibre.com.co/MCO-1', 2499900, 'COP', null)`,
        [reference],
      ),
    );
    const rows = await asRole(db, "anon", null, () =>
      db.query<{ store: string }>(
        "select store from public.product_offers where product_id = $1 order by store",
        [reference],
      ),
    );
    expect(rows.rows.map((row) => row.store)).toEqual(["amazon", "mercadolibre"]);
  });

  it("solo enlaces https, y «otra tienda» necesita nombre", async () => {
    const insert = (store: string, url: string, name: string | null = null) =>
      asRole(db, "authenticated", ADMIN, () =>
        db.query(
          "insert into public.product_offers (product_id, store, store_name, url) values ($1, $2, $3, $4)",
          [reference, store, name, url],
        ),
      );
    await expect(insert("amazon", "javascript:alert(1)")).rejects.toThrow(/check constraint/);
    await expect(insert("amazon", "http://inseguro.com")).rejects.toThrow(/check constraint/);
    await expect(insert("other", "https://tienda.co/x")).rejects.toThrow(/other_named/);
    await insert("other", "https://tienda.co/x", "PC Mundo");
  });

  it("nadie fuera del panel las cambia", async () => {
    await expect(
      asRole(db, "anon", null, () => db.query("update public.product_offers set price = 1")),
    ).rejects.toThrow(/permission denied/);
    const deleted = await asRole(db, "authenticated", "00000000-0000-0000-0000-0000000000ff", () =>
      db.query("delete from public.product_offers"),
    ).catch(() => ({ affectedRows: 0 }));
    expect(deleted.affectedRows ?? 0).toBe(0);
  });
});
