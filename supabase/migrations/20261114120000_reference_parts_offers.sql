-- =============================================================================
-- Comparador de Arma tu PC: piezas de referencia y ofertas de otras tiendas.
--   * products.is_reference: pieza que la tienda no vende pero muestra en Arma
--     tu PC para comparar y armar. Nunca es visible en la tienda (check) y no se
--     puede pedir (create_order exige productos activos), pero se puede leer:
--     la RLS de productos, fotos y ficha la deja ver.
--   * product_offers: dónde más se consigue una pieza (Amazon, MercadoLibre…),
--     con enlace, precio y la fecha en que el admin lo revisó. Los precios se
--     cargan a mano: esas tiendas no dejan consultarlos de forma automática.
-- =============================================================================

alter table public.products
  add column is_reference boolean not null default false,
  add constraint products_reference_hidden check (not (is_reference and is_active));

comment on column public.products.is_reference is
  'Solo referencia: no se vende aquí; aparece en Arma tu PC para comparar.';

create index products_reference_idx on public.products (category_id) where is_reference;

-- Los admins escriben productos columna por columna (security.sql); esta también.
grant insert (is_reference), update (is_reference) on public.products to authenticated;

-- Productos, fotos y ficha: también se leen las piezas de referencia.
drop policy products_select on public.products;
create policy products_select on public.products
  for select to anon, authenticated
  using (is_active or is_reference or (select public.is_admin()));

drop policy product_images_select on public.product_images;
create policy product_images_select on public.product_images
  for select to anon, authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.products p
      where p.id = product_id and (p.is_active or p.is_reference)
    )
  );

drop policy product_specs_select on public.product_specs;
create policy product_specs_select on public.product_specs
  for select to anon, authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.products p
      where p.id = product_id and (p.is_active or p.is_reference)
    )
  );

-- -----------------------------------------------------------------------------
-- Ofertas en otras tiendas
-- -----------------------------------------------------------------------------

create table public.product_offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  store text not null
    check (store in ('amazon', 'mercadolibre', 'alkosto', 'ktronix', 'falabella', 'exito', 'newegg', 'other')),
  -- Nombre visible cuando la tienda es «otra».
  store_name text check (char_length(btrim(store_name)) between 2 and 60),
  url text not null check (url ~ '^https://[^[:space:]]+$' and char_length(url) <= 2000),
  price bigint check (price > 0 and price <= 100000000000),
  currency char(3) not null default 'COP' check (currency in ('COP', 'USD')),
  note text check (char_length(note) <= 120),
  checked_at date not null default current_date,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_offers_other_named check (store <> 'other' or store_name is not null)
);

comment on table public.product_offers is
  'Dónde más se consigue una pieza; precio y fecha de revisión los carga el admin.';

create index product_offers_product_idx on public.product_offers (product_id, position);

create trigger product_offers_set_updated_at
  before update on public.product_offers
  for each row execute function public.set_updated_at();

alter table public.product_offers enable row level security;

create policy product_offers_select on public.product_offers
  for select to anon, authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.products p
      where p.id = product_id and (p.is_active or p.is_reference)
    )
  );
create policy product_offers_admin_insert on public.product_offers
  for insert to authenticated with check ((select public.is_admin()));
create policy product_offers_admin_update on public.product_offers
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy product_offers_admin_delete on public.product_offers
  for delete to authenticated using ((select public.is_admin()));

revoke insert, update, delete, truncate, references, trigger on public.product_offers from anon;
