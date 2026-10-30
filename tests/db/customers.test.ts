import { beforeAll, describe, expect, it } from "vitest";
import { asRole, createTestDatabase, one, type TestDatabase } from "./harness";

const ADMIN = "00000000-0000-0000-0000-00000000000a";
const CUSTOMER = "00000000-0000-0000-0000-00000000000c";

type Customer = {
  email: string;
  name: string;
  orders: number;
  paid_orders: number;
  pending_orders: number;
  spent: string;
  total_count: string;
};

let db: TestDatabase;
let productId: string;

const buyer = (name: string, email: string, phone = "+57 300 123 4567") => ({
  name,
  email,
  phone,
  department: "Cundinamarca",
  city: "Bogotá",
  address: "Calle 1 # 2-3",
  data_consent: true,
});

async function order(customer: ReturnType<typeof buyer>, status?: string) {
  const created = await asRole(db, "anon", null, () =>
    one<{ order_id: string }>(db, "select * from public.create_order($1, $2)", [
      customer,
      [{ product_id: productId, quantity: 1 }],
    ]),
  );
  if (status) {
    await asRole(db, "authenticated", ADMIN, () =>
      db.query("select public.update_order_status($1, $2)", [created.order_id, status]),
    );
  }
  return created.order_id;
}

const customers = (args: unknown[] = []) =>
  asRole(db, "authenticated", ADMIN, () =>
    db.query<Customer>("select * from public.admin_customers($1, $2, $3)", [
      args[0] ?? null,
      args[1] ?? null,
      args[2] ?? "spent",
    ]),
  ).then((result) => result.rows);

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
         values ('GPU DEMO', 'gpu-demo', 'DEMO-GPU', 1000000, $1, true) returning id`,
        [category.id],
      )
    ).id;
    await db.query(`select public.adjust_stock($1, 20, 'initial', 'Carga inicial')`, [productId]);
  });
  // Laura compra dos veces (una con el correo en mayúsculas) y deja una pendiente.
  await order(buyer("Laura Gómez", "laura@demo.test"), "confirmed");
  await order(buyer("Laura G.", "LAURA@demo.test ", "+57 311 999 8888"), "confirmed");
  await order(buyer("Laura G.", "laura@demo.test", "+57 311 999 8888"));
  // Carlos compró una vez y canceló otra.
  await order(buyer("Carlos Pérez", "carlos@demo.test"), "confirmed");
  await order(buyer("Carlos Pérez", "carlos@demo.test"), "cancelled");
  // Eva solo tiene un pedido pendiente.
  await order(buyer("Eva Ruiz", "eva@demo.test"));
}, 60_000);

describe("clientes", () => {
  it("agrupa por correo y cuenta solo lo pagado como gastado", async () => {
    const rows = await customers();
    expect(rows.map((row) => [row.email, row.orders, row.paid_orders, Number(row.spent)])).toEqual([
      ["laura@demo.test", 3, 2, 2_000_000],
      ["carlos@demo.test", 2, 1, 1_000_000],
      ["eva@demo.test", 1, 0, 0],
    ]);
    // El nombre es el del pedido más reciente.
    expect(rows[0]?.name).toBe("Laura G.");
    expect(Number(rows[0]?.total_count)).toBe(3);
  });

  it("filtra recurrentes y busca por nombre, correo o teléfono", async () => {
    expect((await customers([null, "frequent"])).map((row) => row.email)).toEqual([
      "laura@demo.test",
    ]);
    expect((await customers(["carlos"])).map((row) => row.email)).toEqual(["carlos@demo.test"]);
    expect((await customers(["999 8888"])).map((row) => row.email)).toEqual(["laura@demo.test"]);
    // Se busca por el teléfono más reciente; pocos dígitos no buscan (casi todo coincidiría).
    expect(await customers(["57"])).toEqual([]);
  });

  it("el resumen cuenta cada grupo", async () => {
    const summary = await asRole(db, "authenticated", ADMIN, () =>
      one<Record<string, unknown>>(db, "select * from public.admin_customer_summary()"),
    );
    expect(
      Object.fromEntries(Object.entries(summary).map(([key, value]) => [key, Number(value)])),
    ).toEqual({
      customers: 3,
      buyers: 2,
      frequent: 1,
      new_30d: 3,
      inactive: 0,
      average_spent: 1_500_000,
    });
  });

  it("alguien que no es admin no ve clientes", async () => {
    const rows = await asRole(db, "authenticated", CUSTOMER, () =>
      db.query("select * from public.admin_customers()"),
    );
    expect(rows.rows).toHaveLength(0);
    await expect(
      asRole(db, "anon", null, () => db.query("select * from public.admin_customers()")),
    ).rejects.toThrow(/permission denied/);
  });
});
