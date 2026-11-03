import { beforeAll, describe, expect, it } from "vitest";
import { asRole, createTestDatabase, type TestDatabase } from "./harness";

const ADMIN = "00000000-0000-0000-0000-00000000000a";

let db: TestDatabase;

const subscribe = (email: string, consent = true, source = "arma-tu-pc") =>
  asRole(db, "anon", null, () =>
    db.query("select public.subscribe_newsletter($1, $2, $3, 'v1')", [email, consent, source]),
  );

const rows = () =>
  asRole(db, "authenticated", ADMIN, () =>
    db.query<{ email: string; status: string; source: string }>(
      "select email, status, source from public.newsletter_subscribers order by email",
    ),
  ).then((result) => result.rows);

beforeAll(async () => {
  db = await createTestDatabase();
  await db.exec(`
    insert into auth.users (id, email) values ('${ADMIN}', 'admin@demo.test');
    update public.profiles set role = 'admin' where id = '${ADMIN}';
  `);
}, 60_000);

describe("novedades", () => {
  it("pide la autorización y un correo válido", async () => {
    await expect(subscribe("ana@correo.com", false)).rejects.toThrow(/CONSENT_REQUIRED/);
    await expect(subscribe("no-es-correo")).rejects.toThrow(/INVALID_EMAIL/);
  });

  it("guarda el correo en minúsculas, una sola vez", async () => {
    await subscribe("  Ana@Correo.com ");
    await subscribe("ana@correo.com", true, "pie");
    expect(await rows()).toEqual([
      { email: "ana@correo.com", status: "active", source: "arma-tu-pc" },
    ]);
  });

  it("se da de baja y puede volver", async () => {
    await asRole(db, "anon", null, () =>
      db.query("select public.unsubscribe_newsletter('ANA@correo.com')"),
    );
    expect((await rows())[0]?.status).toBe("unsubscribed");
    await subscribe("ana@correo.com", true, "pie");
    expect((await rows())[0]).toMatchObject({ status: "active", source: "pie" });
  });

  it("nadie fuera del panel ve la lista", async () => {
    await expect(
      asRole(db, "anon", null, () => db.query("select * from public.newsletter_subscribers")),
    ).rejects.toThrow(/permission denied/);
    const other = await asRole(db, "authenticated", "00000000-0000-0000-0000-0000000000ff", () =>
      db.query("select * from public.newsletter_subscribers"),
    );
    expect(other.rows).toHaveLength(0);
  });
});
