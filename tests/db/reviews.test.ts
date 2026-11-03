import { beforeAll, describe, expect, it } from "vitest";
import { asRole, createTestDatabase, one, type TestDatabase } from "./harness";

// Las pruebas de este archivo comparten estado y se ejecutan en orden.
const ADMIN = "00000000-0000-0000-0000-00000000000a";

const customer = {
  name: "Cliente Demo",
  email: "comprador@demo.test",
  phone: "+57 300 123 4567",
  department: "Cundinamarca",
  city: "Bogotá",
  address: "Calle 1 # 2-3",
  data_consent: true,
};

let db: TestDatabase;
let order: { order_id: string; order_number: number; access_token: string };

type Published = {
  count: number;
  average: number | null;
  items: { display_name: string; city: string | null; rating: number; body: string }[];
};

const submit = (
  token: string,
  rating = 5,
  body = "Llegó rápido y bien empacado.",
  showCity = true,
) =>
  asRole(db, "anon", null, () =>
    one<{ submit_store_review: { status: string } }>(
      db,
      "select public.submit_store_review($1, $2, $3, $4, 'Laura M.', $5)",
      [order.order_id, token, rating, body, showCity],
    ),
  );

const published = () =>
  asRole(db, "anon", null, () =>
    one<{ get_store_reviews: Published }>(db, "select public.get_store_reviews(10)"),
  ).then((row) => row.get_store_reviews);

const setStatus = (status: string) =>
  asRole(db, "authenticated", ADMIN, () =>
    db.query("select public.update_order_status($1, $2::public.order_status, null)", [
      order.order_id,
      status,
    ]),
  );

beforeAll(async () => {
  db = await createTestDatabase();
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${ADMIN}', 'admin@demo.test', '{"full_name":"Admin Demo"}');
    update public.profiles set role = 'admin' where id = '${ADMIN}';
  `);
  let productId = "";
  await asRole(db, "authenticated", ADMIN, async () => {
    const category = await one<{ id: string }>(
      db,
      `insert into public.categories (name, slug) values ('Gráficas', 'graficas') returning id`,
    );
    productId = (
      await one<{ id: string }>(
        db,
        `insert into public.products (name, slug, sku, price, category_id, is_active)
         values ('GPU DEMO', 'gpu-demo', 'DEMO-GPU', 1500000, $1, true) returning id`,
        [category.id],
      )
    ).id;
    await db.query(`select public.adjust_stock($1, 5, 'initial', 'Carga inicial')`, [productId]);
  });
  order = await asRole(db, "anon", null, () =>
    one(db, "select * from public.create_order($1, $2)", [
      customer,
      [{ product_id: productId, quantity: 1 }],
    ]),
  );
}, 60_000);

describe("opiniones de compradores", () => {
  it("solo opina quien tiene el enlace del pedido, y cuando ya lo recibió", async () => {
    await expect(submit("token-falso")).rejects.toThrow(/NOT_FOUND/);
    await expect(submit(order.access_token)).rejects.toThrow(/NOT_DELIVERED/);
    for (const status of ["confirmed", "preparing", "shipped", "delivered"])
      await setStatus(status);
    await expect(submit(order.access_token, 6)).rejects.toThrow(/VALIDATION/);
    await expect(submit(order.access_token, 5, "corta")).rejects.toThrow(/VALIDATION/);
  });

  it("queda en revisión, avisa al panel y no se publica todavía", async () => {
    const result = await submit(order.access_token);
    expect(result.submit_store_review.status).toBe("pending");
    // Corregirla mientras está en revisión no vuelve a avisar.
    await submit(order.access_token, 4, "Llegó rápido; el empaque, mejorable.", false);
    const alerts = await asRole(db, "authenticated", ADMIN, () =>
      db.query("select title from public.admin_alerts where kind = 'review_new'"),
    );
    expect(alerts.rows).toHaveLength(1);
    expect((await published()).count).toBe(0);
    const mine = await asRole(db, "anon", null, () =>
      one<{ review: { status: string; rating: number; show_city: boolean } }>(
        db,
        "select public.get_order_review($1, $2) as review",
        [order.order_id, order.access_token],
      ),
    );
    expect(mine.review).toMatchObject({ status: "pending", rating: 4, show_city: false });
  });

  it("nadie la lee ni la cambia fuera del panel", async () => {
    await expect(
      asRole(db, "anon", null, () => db.query("select * from public.store_reviews")),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asRole(db, "anon", null, () =>
        db.query(
          "select public.moderate_store_review(id, 'approved') from (select gen_random_uuid() id) x",
        ),
      ),
    ).rejects.toThrow();
  });

  it("aprobada, se publica sin datos del pedido; ya no se puede cambiar", async () => {
    await asRole(db, "authenticated", ADMIN, async () => {
      const row = await one<{ id: string }>(db, "select id from public.store_reviews");
      await db.query("select public.moderate_store_review($1, 'approved')", [row.id]);
    });
    const list = await published();
    expect(list.count).toBe(1);
    expect(Number(list.average)).toBe(4);
    expect(list.items[0]).toEqual(
      expect.objectContaining({ display_name: "Laura M.", city: null, rating: 4 }),
    );
    expect(Object.keys(list.items[0] ?? {})).not.toContain("order_id");
    await expect(submit(order.access_token)).rejects.toThrow(/ALREADY_REVIEWED/);
  });
});
