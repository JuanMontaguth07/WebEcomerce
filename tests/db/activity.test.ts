import { beforeAll, describe, expect, it } from "vitest";
import { asRole, createTestDatabase, one, type TestDatabase } from "./harness";

// Las pruebas de este archivo comparten estado y se ejecutan en orden.
const ADMIN = "00000000-0000-0000-0000-00000000000a";
const CUSTOMER = "00000000-0000-0000-0000-00000000000c";

const customer = {
  name: "Cliente Demo",
  email: "cliente@demo.test",
  phone: "3001234567",
  department: "Antioquia",
  city: "Medellín",
  address: "Calle 10 # 20-30",
  data_consent: true,
};

type Entry = {
  entity: string;
  action: string;
  entity_id: string | null;
  entity_label: string | null;
  actor_id: string | null;
  actor_label: string | null;
  changes: Record<string, unknown> | null;
  reason: string | null;
};

let db: TestDatabase;
let categoryId: string;
let productId: string;
let orderId: string;

const asAdmin = <T>(fn: () => Promise<T>) => asRole(db, "authenticated", ADMIN, fn);

/** Entradas del historial más recientes primero (leídas como superusuario). */
async function entries(where = "true", params: unknown[] = []) {
  const result = await db.query<Entry>(
    `select * from public.audit_log where ${where} order by id desc`,
    params,
  );
  return result.rows;
}

beforeAll(async () => {
  db = await createTestDatabase();
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${ADMIN}', 'admin@demo.test', '{"full_name":"Admin Demo"}'),
      ('${CUSTOMER}', 'cliente@demo.test', '{}');
    update public.profiles set role = 'admin' where id = '${ADMIN}';
  `);
}, 60_000);

describe("historial del catálogo", () => {
  it("registra la creación con quién lo hizo", async () => {
    await asAdmin(async () => {
      categoryId = (
        await one<{ id: string }>(
          db,
          `insert into public.categories (name, slug) values ('Memorias', 'memorias') returning id`,
        )
      ).id;
      productId = (
        await one<{ id: string }>(
          db,
          `insert into public.products (name, slug, sku, price, category_id, is_active)
           values ('Memoria DEMO', 'memoria-demo', 'DEMO-RAM', 100000, $1, true) returning id`,
          [categoryId],
        )
      ).id;
    });

    const [created] = await entries("entity = 'product'");
    expect(created).toMatchObject({
      action: "create",
      entity_id: productId,
      entity_label: "Memoria DEMO",
      actor_id: ADMIN,
      actor_label: "Admin Demo",
    });
    expect(created?.changes).toMatchObject({ sku: "DEMO-RAM", price: 100000 });
    expect(created?.changes).not.toHaveProperty("search_vector");
  });

  it("en ediciones guarda solo los campos que cambiaron", async () => {
    await asAdmin(() =>
      db.query(`update public.products set price = 95000, name = name where id = $1`, [productId]),
    );
    const [edited] = await entries("entity = 'product' and action = 'update'");
    expect(edited?.changes).toEqual({ price: { old: 100000, new: 95000 } });
  });

  it("ignora cambios técnicos (stock, recálculo de búsqueda)", async () => {
    const before = (await entries()).length;
    await asAdmin(() =>
      db.query(`select public.adjust_stock($1, 10, 'initial', null)`, [productId]),
    );
    await db.query(`update public.categories set name = 'Memorias RAM' where id = $1`, [
      categoryId,
    ]);
    const after = await entries();
    // Solo el movimiento de inventario y el cambio de nombre de la categoría.
    expect(after.length - before).toBe(2);
    expect(after.map((entry) => entry.entity).slice(0, 2)).toEqual(["category", "inventory"]);
    expect(after[1]?.changes).toMatchObject({
      movement_type: "initial",
      quantity: 10,
      resulting_stock: 10,
    });
  });

  it("registra la ficha técnica como un solo cambio", async () => {
    const spec = await asAdmin(() =>
      one<{ id: string }>(
        db,
        `insert into public.spec_definitions (category_id, key, label, unit, data_type)
         values ($1, 'capacidad', 'Capacidad', 'GB', 'number') returning id`,
        [categoryId],
      ),
    );
    await asAdmin(() =>
      db.query(`select public.set_product_specs($1, $2)`, [
        productId,
        JSON.stringify([{ spec_id: spec.id, value: "16" }]),
      ]),
    );
    const [specs] = await entries("entity = 'product_specs'");
    expect(specs?.changes).toEqual({ "Capacidad (GB)": { old: null, new: 16 } });

    const before = (await entries()).length;
    await asAdmin(() =>
      db.query(`select public.set_product_specs($1, $2)`, [
        productId,
        JSON.stringify([{ spec_id: spec.id, value: "16" }]),
      ]),
    );
    expect((await entries()).length).toBe(before);
  });

  it("nadie edita ni borra el historial, y solo el admin lo lee", async () => {
    await expect(asAdmin(() => db.query(`delete from public.audit_log`))).rejects.toThrow(
      /permission denied/,
    );
    await expect(db.query(`update public.audit_log set reason = 'x'`)).rejects.toThrow(
      /AUDIT_LOG_IMMUTABLE/,
    );
    await expect(
      asRole(db, "anon", null, () => db.query(`select * from public.audit_log`)),
    ).rejects.toThrow(/permission denied/);
    const visible = await asRole(db, "authenticated", CUSTOMER, () =>
      db.query(`select * from public.audit_log`),
    );
    expect(visible.rows).toHaveLength(0);
    const forAdmin = await asAdmin(() => db.query(`select * from public.audit_log`));
    expect(forAdmin.rows.length).toBeGreaterThan(0);
  });
});

describe("pedidos en el historial", () => {
  it("registra la creación por el cliente y los cambios de estado", async () => {
    orderId = (
      await asRole(db, "anon", null, () =>
        one<{ order_id: string }>(db, "select * from public.create_order($1, $2)", [
          customer,
          [{ product_id: productId, quantity: 2 }],
        ]),
      )
    ).order_id;

    const [created] = await entries("entity = 'order'");
    expect(created).toMatchObject({ action: "create", entity_id: orderId, actor_id: null });
    expect(created?.changes).toMatchObject({ status: "pending", total: 190000 });
    // La venta queda en el pedido, no como movimiento manual.
    expect(await entries("entity = 'inventory'")).toHaveLength(1);
  });

  it("fija el envío por confirmar y recalcula el total", async () => {
    const total = await asAdmin(() =>
      one<{ total: number }>(
        db,
        `select public.set_order_shipping($1, 15000, 'Servientrega') total`,
        [orderId],
      ),
    );
    expect(Number(total.total)).toBe(205000);
    const saved = await one<{ shipping_cost: number; total: number }>(
      db,
      `select shipping_cost, total from public.orders where id = $1`,
      [orderId],
    );
    expect(Number(saved.shipping_cost)).toBe(15000);
    expect(Number(saved.total)).toBe(205000);

    const [entry] = await entries("entity = 'order' and action = 'update'");
    expect(entry?.changes).toEqual({
      shipping_cost: { old: null, new: 15000 },
      total: { old: 190000, new: 205000 },
    });
    expect(entry?.reason).toBe("Servientrega");

    await expect(
      asRole(db, "authenticated", CUSTOMER, () =>
        db.query(`select public.set_order_shipping($1, 0)`, [orderId]),
      ),
    ).rejects.toThrow(/FORBIDDEN/);
    await expect(
      asAdmin(() => db.query(`select public.set_order_shipping($1, -1)`, [orderId])),
    ).rejects.toThrow(/VALIDATION/);
  });

  it("no borra productos de pedidos sin cerrar", async () => {
    await expect(
      asAdmin(() => db.query(`select public.delete_product($1, 'Prueba')`, [productId])),
    ).rejects.toThrow(/PRODUCT_IN_OPEN_ORDERS/);
  });

  it("registra el cambio de estado con la nota", async () => {
    await asAdmin(() =>
      db.query(`select public.update_order_status($1, 'cancelled', 'Era una prueba')`, [orderId]),
    );
    const [entry] = await entries("entity = 'order' and action = 'update'");
    expect(entry?.changes).toEqual({ status: { old: "pending", new: "cancelled" } });
    expect(entry?.reason).toBe("Era una prueba");
    expect(entry?.actor_id).toBe(ADMIN);
  });

  it("no cambia el envío de pedidos cerrados", async () => {
    await expect(
      asAdmin(() => db.query(`select public.set_order_shipping($1, 1000)`, [orderId])),
    ).rejects.toThrow(/ORDER_LOCKED/);
  });
});

describe("eliminar productos con historial", () => {
  it("duplica un producto como borrador oculto con su ficha", async () => {
    const copy = await asAdmin(() =>
      one<{ id: string }>(db, `select public.duplicate_product($1) id`, [productId]),
    );
    const row = await one<{
      name: string;
      slug: string;
      sku: string;
      is_active: boolean;
      specs: number;
    }>(
      db,
      `select name, slug, sku, is_active,
              (select count(*)::int from public.product_specs where product_id = p.id) specs
       from public.products p where id = $1`,
      [copy.id],
    );
    expect(row).toEqual({
      name: "Memoria DEMO (copia)",
      slug: "memoria-demo-copia",
      sku: "DEMO-RAM-COPIA",
      is_active: false,
      specs: 1,
    });
    const second = await asAdmin(() =>
      one<{ id: string }>(db, `select public.duplicate_product($1) id`, [productId]),
    );
    const secondRow = await one<{ slug: string }>(
      db,
      `select slug from public.products where id = $1`,
      [second.id],
    );
    expect(secondRow.slug).toBe("memoria-demo-copia-2");
  });

  it("solo el admin elimina", async () => {
    await expect(
      asRole(db, "authenticated", CUSTOMER, () =>
        db.query(`select public.delete_product($1)`, [productId]),
      ),
    ).rejects.toThrow(/FORBIDDEN/);
  });

  it("borra el producto y conserva pedidos, movimientos e historial", async () => {
    await db.query(
      `insert into public.product_images (product_id, storage_path, alt_text)
       values ($1, 'products/x/y.webp', 'Foto')`,
      [productId],
    );
    const stock = await one<{ stock: number }>(
      db,
      `select stock from public.products where id = $1`,
      [productId],
    );
    expect(stock.stock).toBe(10);

    const result = await asAdmin(() =>
      one<{ result: { slug: string; images: string[] } }>(
        db,
        `select public.delete_product($1, 'Era una prueba') result`,
        [productId],
      ),
    );
    expect(result.result).toEqual({ slug: "memoria-demo", images: ["products/x/y.webp"] });

    const gone = await one<{ c: number }>(
      db,
      `select count(*)::int c from public.products where id = $1`,
      [productId],
    );
    expect(gone.c).toBe(0);

    const items = await db.query<{ product_id: string | null; product_name: string }>(
      `select product_id, product_name from public.order_items where order_id = $1`,
      [orderId],
    );
    expect(items.rows).toEqual([{ product_id: null, product_name: "Memoria DEMO" }]);

    const movements = await db.query<{
      product_id: string | null;
      product_name: string;
      product_sku: string;
      movement_type: string;
      resulting_stock: number;
    }>(
      `select product_id, product_name, product_sku, movement_type, resulting_stock
       from public.inventory_movements order by created_at, resulting_stock desc`,
    );
    expect(movements.rows.every((row) => row.product_id === null)).toBe(true);
    expect(movements.rows.every((row) => row.product_sku === "DEMO-RAM")).toBe(true);
    // El borrado deja el inventario en cero con un movimiento propio.
    expect(movements.rows.at(-1)).toMatchObject({
      movement_type: "adjustment",
      resulting_stock: 0,
    });

    const [deleted] = await entries("entity = 'product' and action = 'delete'");
    expect(deleted).toMatchObject({
      entity_id: productId,
      entity_label: "Memoria DEMO",
      reason: "Era una prueba",
      actor_id: ADMIN,
    });
    expect(deleted?.changes).toMatchObject({ sku: "DEMO-RAM", price: 95000 });
    // Las imágenes borradas en cascada no generan entradas aparte.
    expect(await entries("entity = 'product_image' and action = 'delete'")).toHaveLength(0);
  });

  it("los indicadores del resumen funcionan sin el producto", async () => {
    const top = await asAdmin(() =>
      db.query<{ product_id: string | null; units: number }>(
        `select * from public.admin_top_products(30, 5)`,
      ),
    );
    // El único pedido se canceló: no hay ventas.
    expect(top.rows).toHaveLength(0);

    const series = await asAdmin(() =>
      db.query<{ day: string; orders: number }>(`select * from public.admin_sales_series(7)`),
    );
    expect(series.rows).toHaveLength(7);

    const stats = await asAdmin(() =>
      one<{ stats: Record<string, unknown> }>(db, `select public.admin_dashboard_stats() stats`),
    );
    expect(stats.stats).toMatchObject({
      orders_by_status: { cancelled: 1 },
      categories_total: 1,
      shipping_rates_active: 0,
    });
  });
});
