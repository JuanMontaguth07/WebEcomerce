import { beforeAll, describe, expect, it } from "vitest";
import { asRole, createTestDatabase, one, type TestDatabase } from "./harness";

// Las pruebas de este archivo comparten estado y se ejecutan en orden.
const ADMIN = "00000000-0000-0000-0000-00000000000a";
const CUSTOMER = "00000000-0000-0000-0000-00000000000c";

const customer = {
  name: "Cliente Demo",
  email: "Comprador@Demo.test",
  phone: "+57 300 123 4567",
  department: "Cundinamarca",
  city: "Bogotá",
  address: "Calle 1 # 2-3",
  data_consent: true,
};

type Id = { id: string };
type Count = { c: number };
type CreatedOrder = { order_id: string; order_number: number; access_token: string };

let db: TestDatabase;
let categoryId: string;
let gpuId: string;
let ramId: string;
let draftId: string;
let order: CreatedOrder;

const stockOf = async (productId: string) =>
  (await one<{ stock: number }>(db, "select stock from public.products where id = $1", [productId]))
    .stock;

const createOrder = (items: unknown[], data: object = customer) =>
  one<CreatedOrder>(db, "select * from public.create_order($1, $2)", [data, items]);

beforeAll(async () => {
  db = await createTestDatabase();
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${ADMIN}', 'admin@demo.test', '{"full_name":"Admin Demo"}'),
      ('${CUSTOMER}', 'cliente@demo.test', '{}');
    update public.profiles set role = 'admin' where id = '${ADMIN}';
  `);
}, 60_000);

describe("perfiles", () => {
  it("se crean automáticamente al registrar usuarios", async () => {
    expect((await one<Count>(db, "select count(*)::int c from public.profiles")).c).toBe(2);
  });

  it("un cliente no puede asignarse el rol de admin", async () => {
    await expect(
      asRole(db, "authenticated", CUSTOMER, () =>
        db.query(`update public.profiles set role = 'admin' where id = '${CUSTOMER}'`),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("un cliente puede actualizar su nombre", async () => {
    await asRole(db, "authenticated", CUSTOMER, () =>
      db.query(`update public.profiles set full_name = 'Cliente' where id = '${CUSTOMER}'`),
    );
  });
});

describe("catálogo", () => {
  it("el admin crea categorías, marcas y productos por la API", async () => {
    await asRole(db, "authenticated", ADMIN, async () => {
      categoryId = (
        await one<Id>(
          db,
          `insert into public.categories (name, slug) values ('Tarjetas gráficas', 'tarjetas-graficas') returning id`,
        )
      ).id;
      const brandId = (
        await one<Id>(
          db,
          `insert into public.brands (name, slug) values ('Marca Demo', 'marca-demo') returning id`,
        )
      ).id;
      gpuId = (
        await one<Id>(
          db,
          `insert into public.products (name, slug, sku, price, compare_at_price, brand_id, category_id, is_active)
           values ('Tarjeta gráfica DEMO 12 GB', 'tarjeta-grafica-demo-12gb', ' demo-gpu-12g ', 2849900, 3239900, $1, $2, true)
           returning id`,
          [brandId, categoryId],
        )
      ).id;
      ramId = (
        await one<Id>(
          db,
          `insert into public.products (name, slug, sku, price, category_id, is_active)
           values ('Memoria DEMO DDR5 32 GB', 'memoria-demo-ddr5-32gb', 'DEMO-RAM-32', 489900, $1, true)
           returning id`,
          [categoryId],
        )
      ).id;
      draftId = (
        await one<Id>(
          db,
          `insert into public.products (name, slug, sku, price, category_id)
           values ('Borrador', 'borrador', 'DEMO-DRAFT', 1000, $1) returning id`,
          [categoryId],
        )
      ).id;
    });
  });

  it("normaliza el SKU", async () => {
    const row = await one<{ sku: string }>(db, "select sku from public.products where id = $1", [
      gpuId,
    ]);
    expect(row.sku).toBe("DEMO-GPU-12G");
  });

  it("rechaza slugs inválidos y precios anteriores menores al actual", async () => {
    await expect(
      asRole(db, "authenticated", ADMIN, () =>
        db.query(`update public.categories set slug = 'Con Espacios' where id = $1`, [categoryId]),
      ),
    ).rejects.toThrow(/check constraint/);
    await expect(
      asRole(db, "authenticated", ADMIN, () =>
        db.query(`update public.products set compare_at_price = 100 where id = $1`, [gpuId]),
      ),
    ).rejects.toThrow(/check constraint/);
  });

  it("ni siquiera el admin edita el stock directamente", async () => {
    await expect(
      asRole(db, "authenticated", ADMIN, () =>
        db.query(`update public.products set stock = 999 where id = $1`, [gpuId]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("clientes y anónimos no modifican el catálogo", async () => {
    await expect(
      asRole(db, "authenticated", CUSTOMER, () =>
        db.query(
          `insert into public.products (name, slug, sku, price, category_id) values ('X', 'x-x', 'X-1', 1, $1)`,
          [categoryId],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
    const updated = await asRole(db, "authenticated", CUSTOMER, () =>
      db.query(`update public.products set price = 1 where id = $1`, [gpuId]),
    );
    expect(updated.affectedRows ?? 0).toBe(0);
    await expect(
      asRole(db, "anon", null, () =>
        db.query(`update public.products set price = 1 where id = $1`, [gpuId]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("los anónimos solo ven productos activos", async () => {
    const row = await asRole(db, "anon", null, () =>
      one<Count>(db, "select count(*)::int c from public.products"),
    );
    expect(row.c).toBe(2);
  });
});

describe("inventario", () => {
  it("el admin registra stock inicial con trazabilidad", async () => {
    await asRole(db, "authenticated", ADMIN, async () => {
      const gpu = await one<{ s: number }>(
        db,
        `select public.adjust_stock($1, 5, 'initial', 'Carga inicial') s`,
        [gpuId],
      );
      const ram = await one<{ s: number }>(
        db,
        `select public.adjust_stock($1, 2, 'initial', null) s`,
        [ramId],
      );
      expect([gpu.s, ram.s]).toEqual([5, 2]);
    });
  });

  it("clientes y anónimos no ajustan stock", async () => {
    await expect(
      asRole(db, "authenticated", CUSTOMER, () =>
        db.query(`select public.adjust_stock($1, 10, 'restock', 'x')`, [gpuId]),
      ),
    ).rejects.toThrow(/FORBIDDEN/);
    await expect(
      asRole(db, "anon", null, () =>
        db.query(`select public.adjust_stock($1, 10, 'restock', 'x')`, [gpuId]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("exige motivo en ajustes y no permite stock negativo", async () => {
    await expect(
      asRole(db, "authenticated", ADMIN, () =>
        db.query(`select public.adjust_stock($1, -1, 'adjustment', '')`, [gpuId]),
      ),
    ).rejects.toThrow(/REASON_REQUIRED/);
    await expect(
      asRole(db, "authenticated", ADMIN, () =>
        db.query(`select public.adjust_stock($1, -50, 'adjustment', 'Conteo físico')`, [gpuId]),
      ),
    ).rejects.toThrow(/INSUFFICIENT_STOCK/);
  });
});

describe("pedidos", () => {
  it("no se pueden insertar pedidos directamente", async () => {
    await expect(
      asRole(db, "anon", null, () =>
        db.query(`insert into public.orders (customer_name) values ('x')`),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it.each([
    [
      "sin consentimiento",
      [{ product_id: "gpu", quantity: 1 }],
      { ...customer, data_consent: false },
      "CONSENT_REQUIRED",
    ],
    ["más unidades que el stock", [{ product_id: "ram", quantity: 3 }], customer, "OUT_OF_STOCK"],
    ["producto inactivo", [{ product_id: "draft", quantity: 1 }], customer, "PRODUCT_UNAVAILABLE"],
    ["cantidad cero", [{ product_id: "gpu", quantity: 0 }], customer, "INVALID_QUANTITY"],
    ["carrito vacío", [], customer, "EMPTY_CART"],
  ])("rechaza pedidos %s", async (_label, items, data, expected) => {
    const ids: Record<string, string> = { gpu: gpuId, ram: ramId, draft: draftId };
    const resolved = items.map((item) => ({ ...item, product_id: ids[item.product_id] }));
    await expect(asRole(db, "anon", null, () => createOrder(resolved, data))).rejects.toThrow(
      new RegExp(expected),
    );
  });

  it("crea el pedido con precios de la base de datos, ignorando los del cliente", async () => {
    order = await asRole(db, "anon", null, () =>
      createOrder([
        { product_id: gpuId, quantity: 1, price: 1 },
        { product_id: gpuId, quantity: 1 },
        { product_id: ramId, quantity: 2 },
      ]),
    );
    expect(order.order_number).toBe(1001);
    expect(order.access_token).toHaveLength(64);

    const saved = await one<{
      subtotal: number;
      total: number;
      customer_email: string;
      customer_phone: string;
    }>(db, "select * from public.orders where id = $1", [order.order_id]);
    expect(Number(saved.subtotal)).toBe(2849900 * 2 + 489900 * 2);
    expect(Number(saved.total)).toBe(Number(saved.subtotal));
    expect(saved.customer_email).toBe("comprador@demo.test");
    expect(saved.customer_phone).toBe("+573001234567");
  });

  it("descuenta el stock y registra los movimientos de venta", async () => {
    expect(await stockOf(gpuId)).toBe(3);
    expect(await stockOf(ramId)).toBe(0);
    const movements = await one<Count>(
      db,
      `select count(*)::int c from public.inventory_movements where order_id = $1 and movement_type = 'sale'`,
      [order.order_id],
    );
    expect(movements.c).toBe(2);
  });

  it("conserva el precio del momento de la compra", async () => {
    await asRole(db, "authenticated", ADMIN, () =>
      db.query(
        `update public.products set price = 2999900, compare_at_price = null where id = $1`,
        [gpuId],
      ),
    );
    const item = await one<{ unit_price: number }>(
      db,
      "select unit_price from public.order_items where order_id = $1 and product_id = $2",
      [order.order_id, gpuId],
    );
    expect(Number(item.unit_price)).toBe(2849900);
  });

  it("permite consultar el pedido solo con el token correcto", async () => {
    const valid = await asRole(db, "anon", null, () =>
      one<{ j: { items: unknown[] } | null }>(db, "select public.get_order_by_token($1, $2) j", [
        order.order_id,
        order.access_token,
      ]),
    );
    expect(valid.j?.items).toHaveLength(2);
    const invalid = await asRole(db, "anon", null, () =>
      one<{ j: unknown }>(db, "select public.get_order_by_token($1, 'x') j", [order.order_id]),
    );
    expect(invalid.j).toBeNull();
  });

  it("aplica visibilidad de pedidos por rol", async () => {
    await expect(
      asRole(db, "anon", null, () => db.query("select * from public.orders")),
    ).rejects.toThrow(/permission denied/);
    const asCustomer = await asRole(db, "authenticated", CUSTOMER, () =>
      one<Count>(db, "select count(*)::int c from public.orders"),
    );
    const asAdmin = await asRole(db, "authenticated", ADMIN, () =>
      one<Count>(db, "select count(*)::int c from public.orders"),
    );
    expect([asCustomer.c, asAdmin.c]).toEqual([0, 1]);
  });

  it("valida las transiciones de estado y los permisos", async () => {
    await expect(
      asRole(db, "authenticated", ADMIN, () =>
        db.query(`select public.update_order_status($1, 'shipped')`, [order.order_id]),
      ),
    ).rejects.toThrow(/INVALID_TRANSITION/);
    await expect(
      asRole(db, "authenticated", CUSTOMER, () =>
        db.query(`select public.update_order_status($1, 'confirmed')`, [order.order_id]),
      ),
    ).rejects.toThrow(/FORBIDDEN/);
  });

  it("cancelar devuelve el stock y deja historial", async () => {
    await asRole(db, "authenticated", ADMIN, () =>
      db.query(`select public.update_order_status($1, 'cancelled', 'Cliente desistió')`, [
        order.order_id,
      ]),
    );
    expect(await stockOf(gpuId)).toBe(5);
    expect(await stockOf(ramId)).toBe(2);
    const history = await one<Count>(
      db,
      "select count(*)::int c from public.order_status_history where order_id = $1",
      [order.order_id],
    );
    expect(history.c).toBe(2);
    await expect(
      asRole(db, "authenticated", ADMIN, () =>
        db.query(`select public.update_order_status($1, 'confirmed')`, [order.order_id]),
      ),
    ).rejects.toThrow(/INVALID_TRANSITION/);
  });

  it("los pedidos pendientes vencidos liberan su stock", async () => {
    const pending = await asRole(db, "anon", null, () =>
      createOrder([{ product_id: gpuId, quantity: 2 }]),
    );
    expect(await stockOf(gpuId)).toBe(3);
    await db.query(
      `update public.orders set expires_at = now() - interval '1 minute' where id = $1`,
      [pending.order_id],
    );
    expect((await one<{ n: number }>(db, "select public.expire_pending_orders() n")).n).toBe(1);
    expect(await stockOf(gpuId)).toBe(5);
    await expect(
      asRole(db, "anon", null, () => db.query("select public.expire_pending_orders()")),
    ).rejects.toThrow(/permission denied/);
  });

  it("todos los movimientos son aritméticamente consistentes", async () => {
    const row = await one<Count>(
      db,
      `select count(*)::int c from public.inventory_movements where resulting_stock <> previous_stock + quantity`,
    );
    expect(row.c).toBe(0);
  });
});

describe("búsqueda", () => {
  const matches = async (where: string, params: unknown[] = []) =>
    (await one<Count>(db, `select count(*)::int c from public.products where ${where}`, params)).c;

  it("encuentra términos sin tildes", async () => {
    expect(
      await matches(
        "search_vector @@ websearch_to_tsquery('pg_catalog.spanish', public.immutable_unaccent($1))",
        ["tarjeta grafica"],
      ),
    ).toBeGreaterThan(0);
  });

  it("incluye la marca y se actualiza si la marca cambia de nombre", async () => {
    const byBrand = "search_vector @@ websearch_to_tsquery('pg_catalog.spanish', $1)";
    expect(await matches(byBrand, ["marca demo"])).toBe(1);
    await db.query(
      `update public.brands set name = 'Fabricante Ejemplo' where slug = 'marca-demo'`,
    );
    expect(await matches(byBrand, ["fabricante"])).toBe(1);
  });

  it("tolera errores de escritura con trigramas", async () => {
    expect(
      await matches("extensions.similarity(public.immutable_unaccent(lower(name)), $1) > 0.3", [
        "tarjta grafca demo",
      ]),
    ).toBeGreaterThan(0);
  });
});

describe("especificaciones", () => {
  it("acepta valores del tipo correcto y rechaza los incorrectos", async () => {
    const spec = await one<Id>(
      db,
      `insert into public.spec_definitions (category_id, key, label, unit, data_type)
       values ($1, 'vram', 'Memoria de video', 'GB', 'number') returning id`,
      [categoryId],
    );
    await db.query(
      "insert into public.product_specs (product_id, spec_id, value_number) values ($1, $2, 12)",
      [gpuId, spec.id],
    );
    await expect(
      db.query(
        "insert into public.product_specs (product_id, spec_id, value_text) values ($1, $2, 'doce')",
        [ramId, spec.id],
      ),
    ).rejects.toThrow(/SPEC_TYPE_MISMATCH/);
  });

  it("rechaza especificaciones de otra categoría y las descarta al cambiar de categoría", async () => {
    const cpu = await one<Id>(
      db,
      `insert into public.categories (name, slug) values ('Procesadores', 'procesadores') returning id`,
    );
    const socket = await one<Id>(
      db,
      `insert into public.spec_definitions (category_id, key, label) values ($1, 'socket', 'Socket') returning id`,
      [cpu.id],
    );
    await expect(
      db.query(
        "insert into public.product_specs (product_id, spec_id, value_text) values ($1, $2, 'AM5')",
        [gpuId, socket.id],
      ),
    ).rejects.toThrow(/SPEC_CATEGORY_MISMATCH/);

    await db.query("update public.products set category_id = $1 where id = $2", [cpu.id, gpuId]);
    const remaining = await one<Count>(
      db,
      "select count(*)::int c from public.product_specs where product_id = $1",
      [gpuId],
    );
    expect(remaining.c).toBe(0);
  });
});

describe("storage", () => {
  it("crea el bucket público y solo el admin sube imágenes", async () => {
    const bucket = await one<{ public: boolean }>(
      db,
      "select public from storage.buckets where id = 'catalog'",
    );
    expect(bucket.public).toBe(true);
    await expect(
      asRole(db, "authenticated", CUSTOMER, () =>
        db.query(`insert into storage.objects (bucket_id, name) values ('catalog', 'x.webp')`),
      ),
    ).rejects.toThrow(/row-level security/);
    await asRole(db, "authenticated", ADMIN, () =>
      db.query(`insert into storage.objects (bucket_id, name) values ('catalog', 'ok.webp')`),
    );
  });
});
