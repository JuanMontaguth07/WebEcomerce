-- =============================================================================
-- Núcleo: extensiones, tipos, utilidades y perfiles.
-- Convenciones:
--   * Dinero en pesos colombianos como bigint (sin decimales).
--   * Todas las funciones security definer fijan search_path = '' y califican
--     cada objeto con su esquema.
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type public.user_role as enum ('customer', 'admin');
create type public.product_type as enum ('component', 'prebuilt', 'peripheral');
create type public.spec_data_type as enum ('text', 'number', 'boolean');
create type public.order_status as enum (
  'pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'
);
create type public.payment_status as enum ('unpaid', 'pending', 'paid', 'failed', 'refunded');
create type public.inventory_movement_type as enum (
  'initial', 'restock', 'sale', 'cancellation', 'adjustment', 'return'
);

-- -----------------------------------------------------------------------------
-- Utilidades
-- -----------------------------------------------------------------------------

-- unaccent() es STABLE; este envoltorio IMMUTABLE permite usarlo en índices.
create or replace function public.immutable_unaccent(value text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, value);
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Dominio reutilizable para slugs: minúsculas, números y guiones simples.
create domain public.slug as text
  check (value ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(value) <= 120);

-- -----------------------------------------------------------------------------
-- Perfiles (1:1 con auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  email text not null,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Datos públicos de cada usuario. El rol solo se cambia por SQL (ver docs/ARCHITECTURE.md).';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crea el perfil automáticamente al registrarse un usuario en Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ¿El usuario autenticado es administrador? Base de todas las políticas RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
