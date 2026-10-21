-- =============================================================================
-- Catálogo: categorías, marcas, productos, imágenes y especificaciones.
-- Las imágenes guardan la ruta dentro de Supabase Storage (no la URL completa)
-- para no acoplar los datos al dominio del proyecto.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Categorías (jerárquicas: Componentes > Tarjetas gráficas)
-- -----------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete restrict,
  name text not null check (char_length(name) between 2 and 80),
  slug public.slug not null unique,
  description text check (char_length(description) <= 2000),
  image_path text,
  position integer not null default 0,
  is_active boolean not null default true,
  seo_title text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_parent_not_self check (parent_id is null or parent_id <> id)
);

create index categories_parent_id_idx on public.categories (parent_id);
create index categories_active_position_idx on public.categories (position) where is_active;

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Marcas
-- -----------------------------------------------------------------------------
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 80),
  slug public.slug not null unique,
  description text check (char_length(description) <= 2000),
  logo_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger brands_set_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Productos
-- El stock NO se edita directamente: solo mediante funciones que registran
-- el movimiento de inventario (ver 20261021120200_commerce.sql).
-- -----------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 200),
  slug public.slug not null unique,
  sku text not null unique check (sku ~ '^[A-Z0-9][A-Z0-9._-]{1,63}$'),
  product_type public.product_type not null default 'component',
  short_description text check (char_length(short_description) <= 300),
  description text check (char_length(description) <= 20000),
  price bigint not null check (price > 0),
  compare_at_price bigint check (compare_at_price is null or compare_at_price > price),
  brand_id uuid references public.brands (id) on delete restrict,
  category_id uuid not null references public.categories (id) on delete restrict,
  stock integer not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0),
  warranty_months smallint check (warranty_months between 0 and 120),
  is_active boolean not null default false,
  is_featured boolean not null default false,
  seo_title text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 160),
  search_vector tsvector not null default ''::tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.products.is_active is
  'Falso = borrador u oculto. Un producto con pedidos o movimientos no se borra: se desactiva.';
comment on column public.products.stock is
  'Solo lo modifican create_order, adjust_stock y la cancelación de pedidos.';

create index products_category_id_idx on public.products (category_id);
create index products_brand_id_idx on public.products (brand_id);
create index products_active_created_idx on public.products (created_at desc) where is_active;
create index products_active_price_idx on public.products (price) where is_active;
create index products_featured_idx on public.products (created_at desc) where is_active and is_featured;
create index products_search_vector_idx on public.products using gin (search_vector);
create index products_name_trgm_idx on public.products
  using gin (public.immutable_unaccent(lower(name)) extensions.gin_trgm_ops);
create index products_sku_trgm_idx on public.products using gin (sku extensions.gin_trgm_ops);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- Normaliza el SKU (mayúsculas, sin espacios) antes de validar el CHECK.
create or replace function public.normalize_product_sku()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.sku = upper(btrim(new.sku));
  return new;
end;
$$;

create trigger products_normalize_sku
  before insert or update of sku on public.products
  for each row execute function public.normalize_product_sku();

-- Vector de búsqueda: nombre y SKU pesan más que marca, categoría y resumen.
create or replace function public.build_product_search_vector(
  p_name text,
  p_sku text,
  p_short_description text,
  p_brand_name text,
  p_category_name text
)
returns tsvector
language sql
immutable
parallel safe
set search_path = ''
as $$
  select
    setweight(to_tsvector('pg_catalog.spanish', public.immutable_unaccent(coalesce(p_name, ''))), 'A')
    || setweight(to_tsvector('pg_catalog.simple', coalesce(p_sku, '')), 'A')
    || setweight(to_tsvector('pg_catalog.spanish', public.immutable_unaccent(coalesce(p_brand_name, ''))), 'B')
    || setweight(to_tsvector('pg_catalog.spanish', public.immutable_unaccent(coalesce(p_category_name, ''))), 'B')
    || setweight(to_tsvector('pg_catalog.spanish', public.immutable_unaccent(coalesce(p_short_description, ''))), 'C');
$$;

create or replace function public.products_refresh_search_vector()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_vector = public.build_product_search_vector(
    new.name,
    new.sku,
    new.short_description,
    (select b.name from public.brands b where b.id = new.brand_id),
    (select c.name from public.categories c where c.id = new.category_id)
  );
  return new;
end;
$$;

create trigger products_search_vector
  before insert or update of name, sku, short_description, brand_id, category_id
  on public.products
  for each row execute function public.products_refresh_search_vector();

-- Si cambia el nombre de una marca o categoría, se recalculan sus productos.
create or replace function public.touch_products_search_vector()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'brands' then
    update public.products set name = name where brand_id = new.id;
  else
    update public.products set name = name where category_id = new.id;
  end if;
  return null;
end;
$$;

create trigger brands_touch_products
  after update of name on public.brands
  for each row when (old.name is distinct from new.name)
  execute function public.touch_products_search_vector();

create trigger categories_touch_products
  after update of name on public.categories
  for each row when (old.name is distinct from new.name)
  execute function public.touch_products_search_vector();

-- -----------------------------------------------------------------------------
-- Imágenes de producto
-- -----------------------------------------------------------------------------
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null check (char_length(storage_path) between 1 and 500),
  alt_text text not null check (char_length(alt_text) between 1 and 200),
  position smallint not null default 0 check (position >= 0),
  width integer check (width > 0),
  height integer check (height > 0),
  created_at timestamptz not null default now(),
  constraint product_images_position_unique unique (product_id, position)
    deferrable initially deferred
);

-- -----------------------------------------------------------------------------
-- Especificaciones técnicas tipadas por categoría.
-- Permiten filtrar por especificación y son la base del futuro configurador
-- (socket, TDP, factor de forma...).
-- -----------------------------------------------------------------------------
create table public.spec_definitions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  key text not null check (key ~ '^[a-z][a-z0-9_]{0,49}$'),
  label text not null check (char_length(label) between 1 and 80),
  group_label text check (char_length(group_label) <= 60),
  unit text check (char_length(unit) <= 20),
  data_type public.spec_data_type not null default 'text',
  is_filterable boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint spec_definitions_category_key_unique unique (category_id, key)
);

create table public.product_specs (
  product_id uuid not null references public.products (id) on delete cascade,
  spec_id uuid not null references public.spec_definitions (id) on delete cascade,
  value_text text check (char_length(value_text) <= 300),
  value_number numeric,
  value_boolean boolean,
  primary key (product_id, spec_id),
  constraint product_specs_single_value check (
    num_nonnulls(value_text, value_number, value_boolean) = 1
  )
);

create index product_specs_spec_number_idx on public.product_specs (spec_id, value_number)
  where value_number is not null;
create index product_specs_spec_text_idx on public.product_specs (spec_id, value_text)
  where value_text is not null;

-- La especificación debe pertenecer a la categoría del producto y el valor
-- debe coincidir con su tipo.
create or replace function public.validate_product_spec()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_spec public.spec_definitions%rowtype;
  v_product_category uuid;
begin
  select * into v_spec from public.spec_definitions where id = new.spec_id;
  select category_id into v_product_category from public.products where id = new.product_id;

  if v_spec.category_id is distinct from v_product_category then
    raise exception 'SPEC_CATEGORY_MISMATCH' using errcode = 'P0001',
      detail = format('La especificación %s no pertenece a la categoría del producto.', v_spec.key);
  end if;

  if (v_spec.data_type = 'text' and new.value_text is null)
    or (v_spec.data_type = 'number' and new.value_number is null)
    or (v_spec.data_type = 'boolean' and new.value_boolean is null) then
    raise exception 'SPEC_TYPE_MISMATCH' using errcode = 'P0001',
      detail = format('La especificación %s espera un valor de tipo %s.', v_spec.key, v_spec.data_type);
  end if;

  return new;
end;
$$;

create trigger product_specs_validate
  before insert or update on public.product_specs
  for each row execute function public.validate_product_spec();

-- Al cambiar la categoría de un producto se descartan las especificaciones
-- que pertenecían a la categoría anterior.
create or replace function public.drop_foreign_product_specs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.product_specs ps
  using public.spec_definitions sd
  where ps.spec_id = sd.id
    and ps.product_id = new.id
    and sd.category_id <> new.category_id;
  return null;
end;
$$;

create trigger products_drop_foreign_specs
  after update of category_id on public.products
  for each row when (old.category_id is distinct from new.category_id)
  execute function public.drop_foreign_product_specs();

-- Funciones de trigger: no se invocan desde la API.
revoke execute on function public.touch_products_search_vector() from public, anon, authenticated;
revoke execute on function public.drop_foreign_product_specs() from public, anon, authenticated;
revoke execute on function public.products_refresh_search_vector() from public, anon, authenticated;
revoke execute on function public.normalize_product_sku() from public, anon, authenticated;
revoke execute on function public.validate_product_spec() from public, anon, authenticated;
