import { beforeAll, describe, expect, it } from "vitest";
import { asRole, createTestDatabase, one, type TestDatabase } from "./harness";

const ADMIN = "00000000-0000-0000-0000-00000000000a";
const OTHER_ADMIN = "00000000-0000-0000-0000-00000000000b";
const CUSTOMER = "00000000-0000-0000-0000-00000000000c";

let db: TestDatabase;

/** Simula lo que Realtime hace al recibir un mensaje: fija el tópico e inserta bajo RLS. */
async function trackPresence(userId: string, topic = "admin-presence") {
  return asRole(db, "authenticated", userId, async () => {
    await db.query("select set_config('realtime.topic', $1, false)", [topic]);
    return db.query(
      `insert into realtime.messages (topic, extension, event) values ($1, 'presence', 'track')`,
      [topic],
    );
  });
}

beforeAll(async () => {
  db = await createTestDatabase();
  await db.exec(`
    insert into auth.users (id, email) values
      ('${ADMIN}', 'admin@demo.test'),
      ('${OTHER_ADMIN}', 'admin2@demo.test'),
      ('${CUSTOMER}', 'cliente@demo.test');
    update public.profiles set role = 'admin' where id in ('${ADMIN}', '${OTHER_ADMIN}');
  `);
}, 60_000);

describe("canal de presencia del panel", () => {
  it("los administradores se anuncian en el canal", async () => {
    await expect(trackPresence(ADMIN)).resolves.toMatchObject({ affectedRows: 1 });
  });

  it("un cliente no puede anunciarse ni escuchar quién está conectado", async () => {
    await expect(trackPresence(CUSTOMER)).rejects.toThrow(/row-level security/);
    const rows = await asRole(db, "authenticated", CUSTOMER, async () => {
      await db.query("select set_config('realtime.topic', 'admin-presence', false)");
      return db.query("select 1 from realtime.messages");
    });
    expect(rows.rows).toHaveLength(0);
  });

  it("la política solo cubre el canal de presencia del panel", async () => {
    await expect(trackPresence(ADMIN, "otro-canal")).rejects.toThrow(/row-level security/);
  });
});

describe("última vez visto", () => {
  it("cada admin marca su propia hora y el otro admin la ve", async () => {
    await asRole(db, "authenticated", ADMIN, () => db.query("select public.touch_admin_seen()"));
    const row = await asRole(db, "authenticated", OTHER_ADMIN, () =>
      one<{ user_id: string; recent: boolean }>(
        db,
        `select user_id, seen_at > now() - interval '1 minute' as recent from public.admin_last_seen`,
      ),
    );
    expect(row).toEqual({ user_id: ADMIN, recent: true });
  });

  it("un cliente no queda registrado ni ve los registros", async () => {
    const rows = await asRole(db, "authenticated", CUSTOMER, async () => {
      await db.query("select public.touch_admin_seen()");
      return db.query("select 1 from public.admin_last_seen");
    });
    expect(rows.rows).toHaveLength(0);
    const total = await one<{ c: number }>(
      db,
      "select count(*)::int c from public.admin_last_seen",
    );
    expect(total.c).toBe(1);
  });

  it("nadie escribe la hora a mano", async () => {
    await expect(
      asRole(db, "authenticated", ADMIN, () =>
        db.query(`update public.admin_last_seen set seen_at = now() - interval '1 day'`),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});
