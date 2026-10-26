import { beforeAll, describe, expect, it } from "vitest";
import { asRole, createTestDatabase, one, type TestDatabase } from "./harness";

// Las pruebas de este archivo comparten estado y se ejecutan en orden.
const ADMIN = "00000000-0000-0000-0000-00000000000a";
const CUSTOMER = "00000000-0000-0000-0000-00000000000c";

type Quote = { price: number | null; min_days: number | null; max_days: number | null };

let db: TestDatabase;
let productId: string;

const quote = (department: string, city: string) =>
  asRole(db, "anon", null, async () => {
    const result = await db.query<Quote>("select * from public.shipping_quote($1, $2)", [
      department,
      city,
    ]);
    return result.rows[0] ?? null;
  });

beforeAll(async () => {
  db = await createTestDatabase();
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${ADMIN}', 'admin@demo.test', '{}'),
      ('${CUSTOMER}', 'cliente@demo.test', '{}');
    update public.profiles set role = 'admin' where id = '${ADMIN}';
  `);
  await asRole(db, "authenticated", ADMIN, async () => {
    const category = await one<{ id: string }>(
      db,
      `insert into public.categories (name, slug) values ('Memorias', 'memorias') returning id`,
    );
    productId = (
      await one<{ id: string }>(
        db,
        `insert into public.products (name, slug, sku, price, category_id, is_active)
         values ('Memoria DEMO', 'memoria-demo', 'DEMO-RAM', 100000, $1, true) returning id`,
        [category.id],
      )
    ).id;
    await db.query(`select public.adjust_stock($1, 10, 'initial', null)`, [productId]);
  });
}, 60_000);

describe("configuración de la tienda", () => {
  it("existe una sola fila, pública para leer", async () => {
    const row = await asRole(db, "anon", null, () =>
      one<{ whatsapp_number: string | null }>(db, "select * from public.store_settings"),
    );
    expect(row.whatsapp_number).toBeNull();
  });

  it("solo el admin la edita y nadie crea otra fila", async () => {
    await asRole(db, "authenticated", ADMIN, () =>
      db.query(
        `update public.store_settings set whatsapp_number = '573001234567', legal_nit = '123456789', legal_dv = '7'`,
      ),
    );
    const updated = await asRole(db, "authenticated", CUSTOMER, async () => {
      await db.query(`update public.store_settings set whatsapp_number = '573009999999'`);
      return one<{ whatsapp_number: string }>(
        db,
        "select whatsapp_number from public.store_settings",
      );
    });
    // El update del cliente no afecta filas (RLS); el valor del admin se mantiene.
    expect(updated.whatsapp_number).toBe("573001234567");

    await expect(
      asRole(db, "authenticated", ADMIN, () =>
        db.query(`insert into public.store_settings (id) values (true)`),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("valida el formato de WhatsApp, NIT y DV", async () => {
    for (const statement of [
      `update public.store_settings set whatsapp_number = '+57 300 123'`,
      `update public.store_settings set legal_nit = '12.345'`,
      `update public.store_settings set legal_dv = '12'`,
      `update public.store_settings set support_email = 'no-es-correo'`,
    ]) {
      await expect(asRole(db, "authenticated", ADMIN, () => db.query(statement))).rejects.toThrow(
        /violates check constraint/,
      );
    }
  });
});

describe("tarifas de envío", () => {
  it("clientes y anónimos no crean tarifas", async () => {
    await expect(
      asRole(db, "anon", null, () =>
        db.query(`insert into public.shipping_rates (department, price) values ('Antioquia', 1)`),
      ),
    ).rejects.toThrow(/row-level security|permission denied/);
    await expect(
      asRole(db, "authenticated", CUSTOMER, () =>
        db.query(`insert into public.shipping_rates (department, price) values ('Antioquia', 1)`),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("sin tarifa, el envío queda por confirmar", async () => {
    expect(await quote("Antioquia", "Medellín")).toBeNull();
  });

  it("la ciudad tiene prioridad sobre el departamento, sin importar tildes ni mayúsculas", async () => {
    await asRole(db, "authenticated", ADMIN, () =>
      db.query(`
        insert into public.shipping_rates (department, city, price, min_days, max_days) values
          ('Antioquia', null, 25000, 3, 5),
          ('Antioquia', 'Medellín', 12000, 1, 2),
          ('Bogotá D.C.', null, 15000, 1, 3);
      `),
    );
    expect(await quote("Antioquia", "  MEDELLIN ")).toMatchObject({ price: 12000, min_days: 1 });
    expect(await quote("Antioquia", "Envigado")).toMatchObject({ price: 25000, max_days: 5 });
    expect(await quote("Bogotá D.C.", "Bogotá")).toMatchObject({ price: 15000 });
    expect(await quote("Nariño", "Pasto")).toBeNull();
  });

  it("no permite tarifas duplicadas para el mismo lugar", async () => {
    await expect(
      asRole(db, "authenticated", ADMIN, () =>
        db.query(
          `insert into public.shipping_rates (department, city, price) values ('Antioquia', 'medellin', 1)`,
        ),
      ),
    ).rejects.toThrow(/duplicate key/);
  });

  it("las tarifas inactivas no se aplican", async () => {
    await asRole(db, "authenticated", ADMIN, () =>
      db.query(`update public.shipping_rates set is_active = false where city = 'Medellín'`),
    );
    expect(await quote("Antioquia", "Medellín")).toMatchObject({ price: 25000 });
  });

  it("el pedido guarda el envío calculado en la base y lo suma al total", async () => {
    const order = await asRole(db, "anon", null, () =>
      one<{ order_id: string }>(db, "select * from public.create_order($1, $2)", [
        {
          name: "Cliente Demo",
          email: "cliente@demo.test",
          phone: "3001234567",
          department: "Bogotá D.C.",
          city: "Bogotá",
          address: "Calle 1 # 2-3",
          data_consent: true,
        },
        [{ product_id: productId, quantity: 2 }],
      ]),
    );
    const saved = await one<{ subtotal: number; shipping_cost: number; total: number }>(
      db,
      "select subtotal, shipping_cost, total from public.orders where id = $1",
      [order.order_id],
    );
    expect(saved).toMatchObject({ subtotal: 200000, shipping_cost: 15000, total: 215000 });
  });
});

describe("pago por Nequi", () => {
  it("valida el número de Nequi (celular de 10 dígitos)", async () => {
    await asRole(db, "authenticated", ADMIN, () =>
      db.query(
        `update public.store_settings set nequi_number = '3001234567', nequi_holder = 'Titular'`,
      ),
    );
    for (const value of ["573001234567", "6011234567", "300123"]) {
      await expect(
        asRole(db, "authenticated", ADMIN, () =>
          db.query(`update public.store_settings set nequi_number = $1`, [value]),
        ),
      ).rejects.toThrow(/violates check constraint/);
    }
  });

  it("la consulta del pedido incluye hasta cuándo se mantiene la reserva", async () => {
    const created = await asRole(db, "anon", null, () =>
      one<{ order_id: string; access_token: string }>(
        db,
        "select * from public.create_order($1, $2)",
        [
          {
            name: "Cliente Nequi",
            email: "nequi@demo.test",
            phone: "3001234567",
            department: "Bogotá D.C.",
            city: "Bogotá",
            address: "Calle 2 # 3-4",
            data_consent: true,
          },
          [{ product_id: productId, quantity: 1 }],
        ],
      ),
    );
    const order = await asRole(db, "anon", null, () =>
      one<{ o: { expires_at: string; status: string } }>(
        db,
        "select public.get_order_by_token($1, $2) o",
        [created.order_id, created.access_token],
      ),
    );
    expect(order.o.status).toBe("pending");
    const hours = (new Date(order.o.expires_at).getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(47);
    expect(hours).toBeLessThanOrEqual(48);
  });
});
