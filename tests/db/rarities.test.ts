import { beforeAll, describe, expect, it } from "vitest";
import { asRole, createTestDatabase, one, type TestDatabase } from "./harness";

// Las pruebas de este archivo comparten estado y se ejecutan en orden.
const ADMIN = "00000000-0000-0000-0000-00000000000a";
const CUSTOMER = "00000000-0000-0000-0000-00000000000c";

let db: TestDatabase;
let productId: string;
let legendaryId: string;

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
  legendaryId = (
    await one<{ id: string }>(db, `select id from public.rarities where slug = 'legendaria'`)
  ).id;
}, 60_000);

describe("rarezas", () => {
  it("vienen tres niveles iniciales ordenados de menor a mayor", async () => {
    const rows = await asRole(db, "anon", null, () =>
      db.query<{ slug: string }>(`select slug from public.rarities order by position`),
    );
    expect(rows.rows.map((row) => row.slug)).toEqual(["rara", "epica", "legendaria"]);
  });

  it("solo el admin las crea; los visitantes no ven las inactivas", async () => {
    await expect(
      asRole(db, "authenticated", CUSTOMER, () =>
        db.query(
          `insert into public.rarities (name, slug, color) values ('Falsa', 'falsa', '#000000')`,
        ),
      ),
    ).rejects.toThrow(/row-level security/);

    await asAdmin(() =>
      db.query(
        `insert into public.rarities (name, slug, color, effect, is_active)
         values ('Mítica', 'mitica', '#E0115F', 'pulse', false)`,
      ),
    );
    const visible = await asRole(db, "anon", null, () =>
      db.query(`select 1 from public.rarities where slug = 'mitica'`),
    );
    expect(visible.rows).toHaveLength(0);
  });

  it("valida color, efecto y nombre", async () => {
    for (const values of [
      `('Mala', 'mala', 'rojo', 'glow')`,
      `('Mala', 'mala', '#FF0000', 'explosion')`,
      `('M', 'mala', '#FF0000', 'glow')`,
    ]) {
      await expect(
        asAdmin(() =>
          db.query(`insert into public.rarities (name, slug, color, effect) values ${values}`),
        ),
      ).rejects.toThrow(/check constraint/);
    }
  });

  it("el admin asigna una rareza y catalog_search la devuelve", async () => {
    await asAdmin(() =>
      db.query(`update public.products set rarity_id = $1 where id = $2`, [legendaryId, productId]),
    );
    const row = await asRole(db, "anon", null, () =>
      one<{ rarity_id: string }>(db, `select rarity_id from public.catalog_search()`),
    );
    expect(row.rarity_id).toBe(legendaryId);

    const [entry] = (
      await db.query<{ changes: unknown }>(
        `select changes from public.audit_log where entity = 'product' and action = 'update'
         order by id desc limit 1`,
      )
    ).rows;
    expect(entry?.changes).toEqual({ rarity_id: { old: null, new: legendaryId } });
  });

  it("borrar una rareza deja los productos sin nivel y queda en el historial", async () => {
    await asAdmin(() => db.query(`delete from public.rarities where id = $1`, [legendaryId]));
    const product = await one<{ rarity_id: string | null }>(
      db,
      `select rarity_id from public.products where id = $1`,
      [productId],
    );
    expect(product.rarity_id).toBeNull();
    const entry = await one<{ entity_label: string; changes: Record<string, unknown> }>(
      db,
      `select entity_label, changes from public.audit_log
       where entity = 'rarity' and action = 'delete'`,
    );
    expect(entry.entity_label).toBe("Legendaria");
    expect(entry.changes).toMatchObject({ color: "#F2A900", effect: "holo" });
  });
});

describe("anuncio de la tienda", () => {
  it("acepta solo enlaces internos", async () => {
    await asAdmin(() => db.query(`update public.store_settings set announcement_href = '/'`));
    await asAdmin(() =>
      db.query(
        `update public.store_settings
         set announcement_text = 'Envío gratis en Medellín', announcement_href = '/productos?oferta=1',
             announcement_enabled = true`,
      ),
    );
    for (const href of [
      "https://otro.sitio",
      "javascript:alert(1)",
      "/con espacio",
      "//otro.sitio",
      "/\\otro.sitio",
    ]) {
      await expect(
        asAdmin(() => db.query(`update public.store_settings set announcement_href = $1`, [href])),
      ).rejects.toThrow(/announcement_href_format/);
    }
  });
});
