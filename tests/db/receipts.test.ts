import { beforeAll, describe, expect, it } from "vitest";
import { asRole, createTestDatabase, one, type TestDatabase } from "./harness";

// Las pruebas de este archivo comparten estado y se ejecutan en orden.
const ADMIN = "00000000-0000-0000-0000-00000000000a";
const CUSTOMER = "00000000-0000-0000-0000-00000000000c";

const customer = {
  name: "Cliente Demo",
  email: "comprador@demo.test",
  phone: "+57 300 123 4567",
  department: "Cundinamarca",
  city: "Bogotá",
  address: "Calle 1 # 2-3",
  data_consent: true,
};

/** Bytes que empiezan como un PNG de verdad (la base mira la firma). */
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(200, 7),
]).toString("base64");
const notAnImage = Buffer.alloc(300, 1).toString("base64");

let db: TestDatabase;
let order: { order_id: string; order_number: number; access_token: string };
let productId: string;

const submit = (token: string, image = png, mime = "image/png") =>
  asRole(db, "anon", null, () =>
    one<{ submit_payment_receipt: { id: string } }>(
      db,
      "select public.submit_payment_receipt($1, $2, $3, $4, 800, 1600, 'Pagué desde Nequi')",
      [order.order_id, token, image, mime],
    ),
  );

const orderRow = () =>
  asRole(db, "authenticated", ADMIN, () =>
    one<{ status: string; payment_status: string }>(
      db,
      "select status, payment_status from public.orders where id = $1",
      [order.order_id],
    ),
  );

const customerView = () =>
  asRole(db, "anon", null, () =>
    one<{ get_order_by_token: { receipt: { status: string; review_note: string | null } | null } }>(
      db,
      "select public.get_order_by_token($1, $2)",
      [order.order_id, order.access_token],
    ),
  ).then((row) => row.get_order_by_token.receipt);

beforeAll(async () => {
  db = await createTestDatabase();
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${ADMIN}', 'admin@demo.test', '{"full_name":"Admin Demo"}'),
      ('${CUSTOMER}', 'cliente@demo.test', '{}');
    update public.profiles set role = 'admin' where id = '${ADMIN}';
  `);
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

describe("comprobantes de pago", () => {
  it("sin el enlace privado del pedido no se puede enviar nada", async () => {
    await expect(submit("token-falso")).rejects.toThrow(/NOT_FOUND/);
  });

  it("revisa que el archivo sea de verdad una imagen", async () => {
    await expect(submit(order.access_token, notAnImage)).rejects.toThrow(/INVALID_IMAGE/);
    await expect(submit(order.access_token, png, "image/jpeg")).rejects.toThrow(/INVALID_IMAGE/);
    await expect(submit(order.access_token, "esto no es base64 !!")).rejects.toThrow(
      /INVALID_IMAGE/,
    );
  });

  it("guarda el comprobante, marca el pago en revisión y avisa al panel", async () => {
    await submit(order.access_token);
    expect(await orderRow()).toEqual({ status: "pending", payment_status: "pending" });
    expect(await customerView()).toMatchObject({ status: "pending" });
    const alert = await asRole(db, "authenticated", ADMIN, () =>
      one<{ title: string; href: string }>(
        db,
        "select title, href from public.admin_alerts where kind = 'payment_receipt'",
      ),
    );
    expect(alert).toEqual({
      title: `Comprobante de pago #${order.order_number}`,
      href: `/admin/pedidos/${order.order_id}`,
    });
  });

  it("nadie fuera del panel ve las imágenes", async () => {
    const anon = await asRole(db, "anon", null, () =>
      db.query("select 1 from public.payment_receipts").catch(() => ({ rows: [] })),
    );
    expect(anon.rows).toHaveLength(0);
    const client = await asRole(db, "authenticated", CUSTOMER, () =>
      db.query("select 1 from public.payment_receipts"),
    );
    expect(client.rows).toHaveLength(0);
  });

  it("un envío nuevo reemplaza al que estaba en revisión", async () => {
    await submit(order.access_token);
    const rows = await asRole(db, "authenticated", ADMIN, () =>
      db.query<{ status: string }>(
        "select status from public.payment_receipts where order_id = $1 order by created_at",
        [order.order_id],
      ),
    );
    expect(rows.rows.map((row) => row.status).sort()).toEqual(["pending", "replaced"]);
  });

  it("rechazar pide un motivo, y el cliente lo ve", async () => {
    const pending = await asRole(db, "authenticated", ADMIN, () =>
      one<{ id: string }>(
        db,
        "select id from public.payment_receipts where status = 'pending' and order_id = $1",
        [order.order_id],
      ),
    );
    await expect(
      asRole(db, "authenticated", ADMIN, () =>
        db.query("select public.review_payment_receipt($1, false, '')", [pending.id]),
      ),
    ).rejects.toThrow(/REASON_REQUIRED/);
    await asRole(db, "authenticated", ADMIN, () =>
      db.query("select public.review_payment_receipt($1, false, 'El valor no coincide')", [
        pending.id,
      ]),
    );
    expect(await customerView()).toMatchObject({
      status: "rejected",
      review_note: "El valor no coincide",
    });
    expect((await orderRow()).payment_status).toBe("unpaid");
  });

  it("aprobar confirma el pedido y deja el pago como pagado", async () => {
    await submit(order.access_token);
    const pending = await asRole(db, "authenticated", ADMIN, () =>
      one<{ id: string }>(
        db,
        "select id from public.payment_receipts where status = 'pending' and order_id = $1",
        [order.order_id],
      ),
    );
    await expect(
      asRole(db, "authenticated", CUSTOMER, () =>
        db.query("select public.review_payment_receipt($1, true)", [pending.id]),
      ),
    ).rejects.toThrow(/FORBIDDEN/);
    await asRole(db, "authenticated", ADMIN, () =>
      db.query("select public.review_payment_receipt($1, true)", [pending.id]),
    );
    expect(await orderRow()).toEqual({ status: "confirmed", payment_status: "paid" });
    // Ya confirmado, no acepta más comprobantes.
    await expect(submit(order.access_token)).rejects.toThrow(/NOT_PENDING/);
  });

  it("un pedido con comprobante en revisión no vence solo", async () => {
    const other = await asRole(db, "anon", null, () =>
      one<{ order_id: string; access_token: string }>(
        db,
        "select * from public.create_order($1, $2)",
        [customer, [{ product_id: productId, quantity: 1 }]],
      ),
    );
    await asRole(db, "anon", null, () =>
      db.query("select public.submit_payment_receipt($1, $2, $3, 'image/png')", [
        other.order_id,
        other.access_token,
        png,
      ]),
    );
    await db.query(
      "update public.orders set expires_at = now() - interval '1 hour' where id = $1",
      [other.order_id],
    );
    await db.query("select public.expire_pending_orders()");
    const row = await one<{ status: string }>(
      db,
      "select status from public.orders where id = $1",
      [other.order_id],
    );
    expect(row.status).toBe("pending");
  });
});
