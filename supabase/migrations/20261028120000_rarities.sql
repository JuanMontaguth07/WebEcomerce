-- =============================================================================
-- Rarezas y anuncio de la tienda.
--   * rarities: niveles visuales (nombre, color, efecto animado) que el admin
--     crea y edita; cada producto puede tener uno. position mayor = más rara.
--   * store_settings: barra de anuncio (texto, enlace interno, encendida).
--   * catalog_search devuelve rarity_id para que las tarjetas muestren el nivel.
--   * Ambos cambios quedan en el historial general.
-- =============================================================================

create table public.rarities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 2 and 40),
  slug public.slug not null unique,
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  effect text not null default 'glow'
    check (effect in ('none', 'glow', 'pulse', 'shimmer', 'holo')),
  description text check (char_length(description) <= 200),
  position integer not null default 0 check (position between 0 and 100),
  show_on_home boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.rarities is
  'Niveles visuales de producto (color y efecto). position mayor = más rara.';

create trigger rarities_set_updated_at
  before update on public.rarities
  for each row execute function public.set_updated_at();

alter table public.rarities enable row level security;

create policy rarities_select on public.rarities
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy rarities_admin_insert on public.rarities
  for insert to authenticated with check ((select public.is_admin()));
create policy rarities_admin_update on public.rarities
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy rarities_admin_delete on public.rarities
  for delete to authenticated using ((select public.is_admin()));

revoke truncate, references, trigger on public.rarities from anon, authenticated;

-- Niveles iniciales: se pueden renombrar, recolorear o borrar desde el panel.
insert into public.rarities (name, slug, color, effect, description, position) values
  ('Rara', 'rara', '#2F80ED', 'glow', 'Difícil de conseguir.', 1),
  ('Épica', 'epica', '#9B51E0', 'shimmer', 'Edición especial o muy buscada.', 2),
  ('Legendaria', 'legendaria', '#F2A900', 'holo', 'Pieza única o de colección.', 3);

-- -----------------------------------------------------------------------------
-- Productos: rareza opcional
-- -----------------------------------------------------------------------------
alter table public.products
  add column rarity_id uuid references public.rarities (id) on delete set null;

create index products_rarity_idx on public.products (rarity_id) where rarity_id is not null;

grant insert (rarity_id), update (rarity_id) on public.products to authenticated;

-- -----------------------------------------------------------------------------
-- Barra de anuncio (ofertas, envíos, novedades)
-- -----------------------------------------------------------------------------
alter table public.store_settings
  add column announcement_text text check (char_length(announcement_text) <= 140),
  -- Solo rutas internas: el anuncio no puede llevar a otro sitio.
  add column announcement_href text constraint store_settings_announcement_href_format
    check (announcement_href is null or (announcement_href ~ '^/[^\s]*$' and char_length(announcement_href) <= 200)),
  add column announcement_enabled boolean not null default false;

-- -----------------------------------------------------------------------------
-- Historial
-- -----------------------------------------------------------------------------
alter table public.audit_log drop constraint audit_log_entity_check;
alter table public.audit_log add constraint audit_log_entity_check check (entity in (
  'product', 'product_image', 'product_specs', 'category', 'spec_definition', 'brand',
  'order', 'inventory', 'shipping_rate', 'store_settings', 'rarity'
));

create trigger rarities_audit
  after insert or update or delete on public.rarities
  for each row execute function private.audit_row_change('rarity');

-- -----------------------------------------------------------------------------
-- catalog_search con rarity_id (cambia el tipo de retorno: se recrea)
-- -----------------------------------------------------------------------------
drop function public.catalog_search(
  text, text, text[], bigint, bigint, boolean, public.product_type, boolean, text, integer, integer
);

-- Listado paginado. p_sort: relevance | price_asc | price_desc | newest | name
create function public.catalog_search(
  p_query text default null,
  p_category text default null,
  p_brands text[] default null,
  p_min_price bigint default null,
  p_max_price bigint default null,
  p_in_stock boolean default false,
  p_product_type public.product_type default null,
  p_on_sale boolean default false,
  p_sort text default 'relevance',
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid,
  name text,
  slug text,
  sku text,
  product_type public.product_type,
  short_description text,
  price bigint,
  compare_at_price bigint,
  stock integer,
  low_stock_threshold integer,
  is_featured boolean,
  created_at timestamptz,
  brand_name text,
  brand_slug text,
  category_name text,
  category_slug text,
  image_path text,
  image_alt text,
  rarity_id uuid,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.id, p.name, p.slug, p.sku, p.product_type, p.short_description,
    p.price, p.compare_at_price, p.stock, p.low_stock_threshold, p.is_featured, p.created_at,
    b.name, b.slug, c.name, c.slug,
    img.storage_path, img.alt_text,
    p.rarity_id,
    count(*) over ()
  from public.catalog_matches(
    p_query, p_category, p_brands, p_min_price, p_max_price, p_in_stock, p_product_type, p_on_sale
  ) m
  join public.products p on p.id = m.product_id
  join public.categories c on c.id = p.category_id
  left join public.brands b on b.id = p.brand_id
  left join lateral (
    select pi.storage_path, pi.alt_text
    from public.product_images pi
    where pi.product_id = p.id
    order by pi.position
    limit 1
  ) img on true
  order by
    case when p_sort = 'relevance' then m.rank end desc,
    case when p_sort = 'price_asc' then p.price end asc,
    case when p_sort = 'price_desc' then p.price end desc,
    case when p_sort = 'name' then p.name end asc,
    case when p_sort = 'newest' then p.created_at end desc,
    (p.stock > 0) desc,
    p.is_featured desc,
    p.created_at desc,
    p.id
  limit least(greatest(coalesce(p_limit, 24), 1), 60)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke execute on function public.catalog_search(
  text, text, text[], bigint, bigint, boolean, public.product_type, boolean, text, integer, integer
) from public;
grant execute on function public.catalog_search(
  text, text, text[], bigint, bigint, boolean, public.product_type, boolean, text, integer, integer
) to anon, authenticated;
