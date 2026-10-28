import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * PostgreSQL en memoria (PGlite) con una simulación mínima de Supabase:
 * roles anon/authenticated, auth.users, auth.uid(), storage, realtime.messages
 * (el tópico del canal sale de la variable realtime.topic) y los privilegios
 * por defecto que Supabase concede en el esquema public. Permite probar las
 * migraciones reales sin Docker.
 */
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema extensions;
  grant usage on schema extensions to anon, authenticated, service_role;
  create schema auth;
  grant usage on schema auth to anon, authenticated, service_role;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant execute on function auth.uid() to anon, authenticated;
  create schema storage;
  grant usage on schema storage to anon, authenticated, service_role;
  create table storage.buckets (
    id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]
  );
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant all on storage.objects to anon, authenticated;
  create schema realtime;
  grant usage on schema realtime to anon, authenticated, service_role;
  create table realtime.messages (
    id bigserial primary key, topic text, extension text, event text, payload jsonb
  );
  alter table realtime.messages enable row level security;
  grant select, insert on realtime.messages to anon, authenticated;
  grant usage on sequence realtime.messages_id_seq to anon, authenticated;
  create function realtime.topic() returns text language sql stable as
    $$ select nullif(current_setting('realtime.topic', true), '') $$;
  grant execute on function realtime.topic() to anon, authenticated;
  create publication supabase_realtime;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

export async function createTestDatabase(options: { seed?: boolean } = {}) {
  const db = new PGlite({ extensions: { pg_trgm, unaccent, pgcrypto } });
  await db.exec(SUPABASE_STUB);

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of files) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }

  if (options.seed) {
    await db.exec(readFileSync(join(process.cwd(), "supabase", "seed.sql"), "utf8"));
  }

  return db;
}

export type TestDatabase = Awaited<ReturnType<typeof createTestDatabase>>;

type Role = "anon" | "authenticated";

/** Ejecuta `fn` con el rol y el usuario (JWT sub) indicados, como lo haría la API. */
export async function asRole<T>(
  db: TestDatabase,
  role: Role,
  userId: string | null,
  fn: () => Promise<T>,
): Promise<T> {
  await db.query("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? ""]);
  await db.query(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await db.query("reset role");
  }
}

export async function one<T = Record<string, unknown>>(
  db: TestDatabase,
  sql: string,
  params?: unknown[],
): Promise<T> {
  const result = await db.query<T>(sql, params);
  const row = result.rows[0];
  if (row === undefined) throw new Error(`La consulta no devolvió filas: ${sql}`);
  return row;
}
