import { beforeAll, describe, expect, it } from "vitest";
import { asRole, createTestDatabase, one, type TestDatabase } from "./harness";

const ADMIN = "00000000-0000-0000-0000-00000000000a";

let db: TestDatabase;
let productId: string;
let hiddenId: string;

type SavedBuild = {
  code: string;
  name: string;
  source: string;
  total: number;
  parent_code: string | null;
  components: {
    kind: string;
    product_id: string | null;
    demo_part_id: string | null;
    name: string;
    sku: string | null;
    price: number;
  }[];
};

const save = (build: object) =>
  asRole(db, "anon", null, () =>
    one<{ code: string }>(db, "select public.save_build($1::jsonb) as code", [
      JSON.stringify(build),
    ]),
  ).then((row) => row.code);

const read = (code: string) =>
  asRole(db, "anon", null, () =>
    one<{ build: SavedBuild | null }>(db, "select public.get_build($1) as build", [code]),
  ).then((row) => row.build);

beforeAll(async () => {
  db = await createTestDatabase();
  await db.exec(`
    insert into auth.users (id, email) values ('${ADMIN}', 'admin@demo.test');
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
         values ('CPU DEMO 8', 'cpu-demo-8', 'DEMO-CPU-8', 1389900, $1, true) returning id`,
        [category.id],
      )
    ).id;
    hiddenId = (
      await one<{ id: string }>(
        db,
        `insert into public.products (name, slug, sku, price, category_id, is_active)
         values ('CPU OCULTA', 'cpu-oculta', 'DEMO-CPU-H', 999, $1, false) returning id`,
        [category.id],
      )
    ).id;
  });
}, 60_000);

describe("guardar configuraciones", () => {
  it("con productos de la tienda, el nombre, SKU y precio salen de la base", async () => {
    const code = await save({
      name: "Mi PC gamer",
      mode: "free",
      source: "catalog",
      budget: 6_000_000,
      // El navegador manda un precio falso: se ignora.
      components: [{ kind: "cpu", product_id: productId, name: "Truco", price: 1 }],
    });
    expect(code).toMatch(/^[A-Za-z0-9]{12}$/);
    const build = await read(code);
    expect(build).toMatchObject({ name: "Mi PC gamer", source: "catalog", total: 1389900 });
    expect(build?.components).toEqual([
      {
        kind: "cpu",
        product_id: productId,
        demo_part_id: null,
        name: "CPU DEMO 8",
        sku: "DEMO-CPU-8",
        price: 1389900,
      },
    ]);
  });

  it("las piezas demo se guardan con su id de código y precio de ejemplo", async () => {
    const code = await save({
      name: "Demo",
      mode: "guided",
      source: "demo",
      answers: { use: "gaming" },
      components: [
        { kind: "cpu", demo_part_id: "demo-cpu-8", name: "Procesador demo", price: 1389900 },
        { kind: "storage", demo_part_id: "demo-ssd-nvme-1t", name: "SSD demo", price: 289900 },
      ],
    });
    const build = await read(code);
    expect(build?.total).toBe(1389900 + 289900);
    expect(build?.components.map((item) => item.demo_part_id)).toEqual([
      "demo-cpu-8",
      "demo-ssd-nvme-1t",
    ]);
  });

  it("guardar a partir de un enlace crea una versión nueva que apunta a la anterior", async () => {
    const first = await save({
      name: "v1",
      mode: "free",
      source: "catalog",
      components: [{ kind: "cpu", product_id: productId }],
    });
    const second = await save({
      name: "v2",
      mode: "free",
      source: "catalog",
      parent_code: first,
      components: [{ kind: "cpu", product_id: productId }],
    });
    expect(second).not.toBe(first);
    expect((await read(second))?.parent_code).toBe(first);
    expect((await read(first))?.name).toBe("v1");
  });

  it("rechaza productos ocultos, piezas sin datos y equipos vacíos", async () => {
    const bad = [
      {
        name: "x",
        mode: "free",
        source: "catalog",
        components: [{ kind: "cpu", product_id: hiddenId }],
      },
      { name: "x", mode: "free", source: "catalog", components: [] },
      {
        name: "",
        mode: "free",
        source: "catalog",
        components: [{ kind: "cpu", product_id: productId }],
      },
      {
        name: "x",
        mode: "free",
        source: "catalog",
        components: [{ kind: "monitor", product_id: productId }],
      },
      {
        name: "x",
        mode: "free",
        source: "demo",
        components: [{ kind: "cpu", demo_part_id: "../hack", name: "x", price: 1 }],
      },
    ];
    for (const build of bad) {
      await expect(save(build), JSON.stringify(build)).rejects.toThrow(
        /PRODUCT_UNAVAILABLE|VALIDATION|check constraint/,
      );
    }
  });

  it("un código inexistente no devuelve nada", async () => {
    expect(await read("NoExiste1234")).toBeNull();
  });
});

describe("privacidad e inmutabilidad", () => {
  it("un visitante no puede listar ni editar las configuraciones", async () => {
    await expect(
      asRole(db, "anon", null, () => db.query("select * from public.builds")),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asRole(db, "authenticated", ADMIN, () => db.query("update public.builds set name = 'x'")),
    ).rejects.toThrow(/permission denied/);
  });

  it("los administradores las pueden consultar", async () => {
    const rows = await asRole(db, "authenticated", ADMIN, () =>
      db.query("select share_code from public.builds"),
    );
    expect(rows.rows.length).toBeGreaterThan(0);
  });

  it("si se elimina el producto, la configuración conserva su copia", async () => {
    const code = await save({
      name: "Con producto borrado",
      mode: "free",
      source: "catalog",
      components: [{ kind: "cpu", product_id: productId }],
    });
    await db.query("delete from public.products where id = $1", [productId]);
    const build = await read(code);
    expect(build?.components[0]).toMatchObject({
      product_id: null,
      name: "CPU DEMO 8",
      price: 1389900,
    });
  });

  it("frena los guardados masivos", async () => {
    await db.query(
      `insert into public.builds (share_code, name, mode, source, total)
       select 'Lote' || lpad(n::text, 8, '0'), 'lote', 'free', 'demo', 0 from generate_series(1, 60) n`,
    );
    await expect(
      save({
        name: "otra",
        mode: "free",
        source: "demo",
        components: [{ kind: "cpu", demo_part_id: "demo-cpu-8", name: "x", price: 1 }],
      }),
    ).rejects.toThrow(/RATE_LIMITED/);
  });
});
