import { beforeAll, describe, expect, it } from "vitest";
import { asRole, createTestDatabase, one, type TestDatabase } from "./harness";

// Las pruebas de este archivo comparten estado y se ejecutan en orden.
const ADMIN = "00000000-0000-0000-0000-00000000000a";
const OTHER = "00000000-0000-0000-0000-00000000000b";
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

type Alert = {
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  actor_id: string | null;
};

let db: TestDatabase;
let productId: string;
let orderId: string;

const alerts = () =>
  asRole(db, "authenticated", ADMIN, () =>
    db.query<Alert>(
      "select kind, title, body, href, actor_id from public.admin_alerts order by created_at, kind",
    ),
  ).then((result) => result.rows);

beforeAll(async () => {
  db = await createTestDatabase();
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${ADMIN}', 'admin@demo.test', '{"full_name":"Admin Demo"}'),
      ('${OTHER}', 'otro@demo.test', '{"full_name":"Otra Admin"}'),
      ('${CUSTOMER}', 'cliente@demo.test', '{}');
    update public.profiles set role = 'admin' where id in ('${ADMIN}', '${OTHER}');
  `);
  await asRole(db, "authenticated", ADMIN, async () => {
    const category = await one<{ id: string }>(
      db,
      `insert into public.categories (name, slug) values ('Gráficas', 'graficas') returning id`,
    );
    productId = (
      await one<{ id: string }>(
        db,
        `insert into public.products (name, slug, sku, price, category_id, is_active, low_stock_threshold)
         values ('GPU DEMO', 'gpu-demo', 'DEMO-GPU', 1500000, $1, true, 2) returning id`,
        [category.id],
      )
    ).id;
    await db.query(`select public.adjust_stock($1, 4, 'initial', 'Carga inicial')`, [productId]);
  });
}, 60_000);

describe("alertas automáticas", () => {
  it("un pedido nuevo avisa con número, cliente, total y productos", async () => {
    const created = await asRole(db, "anon", null, () =>
      one<{ order_id: string; order_number: number }>(
        db,
        "select * from public.create_order($1, $2)",
        [customer, [{ product_id: productId, quantity: 2 }]],
      ),
    );
    orderId = created.order_id;
    const order = (await alerts()).find((alert) => alert.kind === "order_new");
    expect(order).toMatchObject({
      title: `Pedido nuevo #${created.order_number}`,
      href: `/admin/pedidos/${created.order_id}`,
      actor_id: null,
    });
    expect(order?.body).toContain("Cliente Demo · $ 3.000.000");
    expect(order?.body).toContain("1 producto");
  });

  it("el stock que baja del mínimo avisa una sola vez", async () => {
    // 4 − 2 del pedido = 2: llega al mínimo (2) desde arriba.
    const low = (await alerts()).filter((alert) => alert.kind === "stock_low");
    expect(low).toHaveLength(1);
    expect(low[0]?.body).toMatch(/^Quedan 2 unidades · SKU DEMO-GPU/);
    // Otro cambio por debajo del mínimo no repite el aviso.
    await asRole(db, "authenticated", ADMIN, () =>
      db.query(`select public.adjust_stock($1, -1, 'adjustment', 'Conteo')`, [productId]),
    );
    expect((await alerts()).filter((alert) => alert.kind === "stock_low")).toHaveLength(1);
  });

  it("agotarse avisa aparte", async () => {
    await asRole(db, "authenticated", ADMIN, () =>
      db.query(`select public.adjust_stock($1, -1, 'adjustment', 'Conteo')`, [productId]),
    );
    const out = (await alerts()).filter((alert) => alert.kind === "stock_out");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ title: "Se agotó GPU DEMO", actor_id: ADMIN });
  });

  it("el cambio de estado dice quién lo hizo y el estado anterior", async () => {
    await asRole(db, "authenticated", OTHER, () =>
      db.query(`select public.update_order_status($1, 'confirmed')`, [orderId]),
    );
    const status = (await alerts()).find((alert) => alert.kind === "order_status");
    expect(status?.title).toMatch(/: confirmado$/);
    expect(status).toMatchObject({ body: "Antes estaba pendiente de pago.", actor_id: OTHER });
  });

  it("solo los administradores ven las alertas y nadie las escribe a mano", async () => {
    const rows = await asRole(db, "authenticated", CUSTOMER, () =>
      db.query("select 1 from public.admin_alerts"),
    );
    expect(rows.rows).toHaveLength(0);
    await expect(
      asRole(db, "authenticated", ADMIN, () =>
        db.query(`insert into public.admin_alerts (kind, title) values ('order_new', 'falsa')`),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("chat entre administradores", () => {
  it("cada admin escribe como sí mismo y el otro lo lee", async () => {
    await asRole(db, "authenticated", ADMIN, () =>
      db.query(`insert into public.admin_messages (body) values ('¿Llegó el pedido?')`),
    );
    const row = await asRole(db, "authenticated", OTHER, () =>
      one<{ author_id: string; body: string }>(
        db,
        "select author_id, body from public.admin_messages",
      ),
    );
    expect(row).toEqual({ author_id: ADMIN, body: "¿Llegó el pedido?" });
  });

  it("no se puede escribir a nombre de otro, ni vacío, ni editar lo enviado", async () => {
    await expect(
      asRole(db, "authenticated", ADMIN, () =>
        db.query(
          `insert into public.admin_messages (author_id, body) values ($1, 'suplantación')`,
          [OTHER],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      asRole(db, "authenticated", ADMIN, () =>
        db.query(`insert into public.admin_messages (body) values ('   ')`),
      ),
    ).rejects.toThrow(/check constraint/);
    await expect(
      asRole(db, "authenticated", ADMIN, () =>
        db.query(`update public.admin_messages set body = 'x'`),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("un cliente no puede leer ni escribir en el chat", async () => {
    await expect(
      asRole(db, "authenticated", CUSTOMER, () =>
        db.query(`insert into public.admin_messages (body) values ('hola')`),
      ),
    ).rejects.toThrow(/row-level security/);
    const rows = await asRole(db, "authenticated", CUSTOMER, () =>
      db.query("select 1 from public.admin_messages"),
    );
    expect(rows.rows).toHaveLength(0);
  });

  it("marcar como leído guarda la hora de cada cosa por separado", async () => {
    await asRole(db, "authenticated", ADMIN, () =>
      db.query("select public.mark_admin_read('chat')"),
    );
    const row = await asRole(db, "authenticated", ADMIN, () =>
      one<{ chat: boolean }>(
        db,
        `select chat_read_at > now() - interval '1 minute' as chat from public.admin_reads where user_id = $1`,
        [ADMIN],
      ),
    );
    expect(row.chat).toBe(true);
    await expect(
      asRole(db, "authenticated", CUSTOMER, () =>
        db.query("select public.mark_admin_read('chat')"),
      ),
    ).rejects.toThrow(/FORBIDDEN/);
  });
});
