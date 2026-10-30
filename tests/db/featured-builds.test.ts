import { beforeAll, describe, expect, it } from "vitest";
import { asRole, createTestDatabase, one, type TestDatabase } from "./harness";

const ADMIN = "00000000-0000-0000-0000-00000000000a";
const OTHER = "00000000-0000-0000-0000-00000000000c";

type Featured = {
  title: string;
  tag: string | null;
  code: string;
  total: number;
  components: { kind: string; name: string; price: number; available: boolean }[];
};

let db: TestDatabase;
let productId: string;
let buildId: string;
let code: string;

const featured = () =>
  asRole(db, "anon", null, () =>
    one<{ list: Featured[] }>(db, "select public.get_featured_builds() as list"),
  ).then((row) => row.list);

beforeAll(async () => {
  db = await createTestDatabase();
  await db.exec(`
    insert into auth.users (id, email) values ('${ADMIN}', 'admin@demo.test'), ('${OTHER}', 'otro@demo.test');
    update public.profiles set role = 'admin' where id = '${ADMIN}';
  `);
  await asRole(db, "authenticated", ADMIN, async () => {
    const category = await one<{ id: string }>(
      db,
      `insert into public.categories (name, slug, architect_part) values ('Procesadores', 'procesadores', 'cpu') returning id`,
    );
    productId = (
      await one<{ id: string }>(
        db,
        `insert into public.products (name, slug, sku, price, category_id, is_active)
         values ('Ryzen 5', 'ryzen-5', 'CPU-R5', 1000000, $1, true) returning id`,
        [category.id],
      )
    ).id;
  });
  code = await asRole(db, "anon", null, () =>
    one<{ code: string }>(db, "select public.save_build($1::jsonb) as code", [
      JSON.stringify({
        name: "Gamer",
        mode: "free",
        source: "catalog",
        components: [{ kind: "cpu", product_id: productId }],
      }),
    ]),
  ).then((row) => row.code);
  buildId = await asRole(db, "authenticated", ADMIN, () =>
    one<{ id: string }>(db, "select id from public.builds where share_code = $1", [code]),
  ).then((row) => row.id);
}, 60_000);

describe("PCs ya armadas", () => {
  it("el admin destaca una configuración y el público la ve con sus piezas", async () => {
    await asRole(db, "authenticated", ADMIN, () =>
      db.query(
        "insert into public.featured_builds (build_id, title, tag) values ($1, 'Gamer 1080p', 'Para jugar')",
        [buildId],
      ),
    );
    const list = await featured();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      title: "Gamer 1080p",
      tag: "Para jugar",
      code,
      total: 1_000_000,
      components: [{ kind: "cpu", name: "Ryzen 5", price: 1_000_000, available: true }],
    });
  });

  it("el total sigue el precio de hoy, y avisa si la pieza ya no está", async () => {
    await asRole(db, "authenticated", ADMIN, () =>
      db.query("update public.products set price = 900000 where id = $1", [productId]),
    );
    expect((await featured())[0]?.total).toBe(900_000);
    await asRole(db, "authenticated", ADMIN, () =>
      db.query("update public.products set is_active = false where id = $1", [productId]),
    );
    const [build] = await featured();
    // Sin la pieza en la tienda se usa el precio con que se guardó.
    expect(build?.total).toBe(1_000_000);
    expect(build?.components[0]?.available).toBe(false);
  });

  it("las ocultas no salen y nadie fuera del panel las cambia", async () => {
    await asRole(db, "authenticated", ADMIN, () =>
      db.query("update public.featured_builds set is_active = false"),
    );
    expect(await featured()).toEqual([]);
    await expect(
      asRole(db, "anon", null, () => db.query("select * from public.featured_builds")),
    ).rejects.toThrow(/permission denied/);
    const rows = await asRole(db, "authenticated", OTHER, () =>
      db.query("update public.featured_builds set title = 'hack'"),
    );
    expect(rows.affectedRows ?? 0).toBe(0);
  });
});
