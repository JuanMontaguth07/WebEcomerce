-- =============================================================================
-- Rarezas como niveles de calidad y etiquetas de bandera por producto.
--   * Las rarezas ya no tienen bloque en la portada (se quita show_on_home) y
--     pasan a describir calidad/precio: Común → Legendario.
--   * product_flags: etiqueta tipo bandera con color y logo pequeño (NVIDIA,
--     AMD Ryzen, Intel Core…) que se asigna a cada producto.
--   * catalog_search devuelve flag_id. Todo queda en el historial general.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Niveles de calidad
-- -----------------------------------------------------------------------------
alter table public.rarities drop column show_on_home;

comment on table public.rarities is
  'Niveles de calidad del producto (color y efecto). position mayor = mejor gama.';

-- Los tres niveles iniciales se renombran; los que el admin ya haya cambiado de
-- slug no se tocan.
update public.rarities set
  name = 'Raro', slug = 'raro', color = '#2F80ED', effect = 'glow', position = 3,
  description = 'Calidad de verdad a un precio competente.'
where slug = 'rara';

update public.rarities set
  name = 'Épico', slug = 'epico', color = '#9B51E0', effect = 'shimmer', position = 4,
  description = 'Buenísimo y caro, pero lo vale.'
where slug = 'epica';

update public.rarities set
  name = 'Legendario', slug = 'legendario', color = '#F2A900', effect = 'holo', position = 6,
  description = 'Tope de gama. No hay más palabras.'
where slug = 'legendaria';

insert into public.rarities (name, slug, color, effect, description, position) values
  ('Común', 'comun', '#8A8F98', 'none', 'Económico y funcional para lo básico.', 1),
  ('Poco común', 'poco-comun', '#22A45D', 'none', 'Un poco más que lo básico, sin llegar al estándar.', 2),
  ('Ultra raro', 'ultra-raro', '#E0115F', 'pulse', 'Súper bueno y más caro: si tienes con qué, vale cada peso.', 5)
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Etiquetas de bandera
-- -----------------------------------------------------------------------------
create table public.product_flags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 2 and 40),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  -- Ruta en el bucket del catálogo (flags/<uuid>.<ext>); NULL = sin logo.
  logo_path text check (logo_path ~ '^flags/[0-9a-f-]{36}\.(webp|png|jpg|jpeg|avif)$'),
  show_name boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.product_flags is
  'Etiquetas tipo bandera (marca o línea: NVIDIA, AMD Ryzen…) con color y logo.';

create trigger product_flags_set_updated_at
  before update on public.product_flags
  for each row execute function public.set_updated_at();

alter table public.product_flags enable row level security;

create policy product_flags_select on public.product_flags
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy product_flags_admin_insert on public.product_flags
  for insert to authenticated with check ((select public.is_admin()));
create policy product_flags_admin_update on public.product_flags
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy product_flags_admin_delete on public.product_flags
  for delete to authenticated using ((select public.is_admin()));

revoke truncate, references, trigger on public.product_flags from anon, authenticated;

alter table public.products
  add column flag_id uuid references public.product_flags (id) on delete set null;

create index products_flag_idx on public.products (flag_id) where flag_id is not null;

grant insert (flag_id), update (flag_id) on public.products to authenticated;

-- -----------------------------------------------------------------------------
-- Historial
-- -----------------------------------------------------------------------------
alter table public.audit_log drop constraint audit_log_entity_check;
alter table public.audit_log add constraint audit_log_entity_check check (entity in (
  'product', 'product_image', 'product_specs', 'category', 'spec_definition', 'brand',
  'order', 'inventory', 'shipping_rate', 'store_settings', 'rarity', 'product_flag'
));

create trigger product_flags_audit
  after insert or update or delete on public.product_flags
  for each row execute function private.audit_row_change('product_flag');

-- -----------------------------------------------------------------------------
-- catalog_search con flag_id (cambia el tipo de retorno: se recrea)
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
  flag_id uuid,
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
    p.rarity_id, p.flag_id,
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
