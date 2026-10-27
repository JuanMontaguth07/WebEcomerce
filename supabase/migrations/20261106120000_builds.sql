-- =============================================================================
-- Kova Architect: configuraciones guardadas y compartidas.
--   * builds: cada guardado es una fila nueva que no se modifica (inmutable).
--     Guardar a partir de un enlace crea una versión nueva que apunta a la
--     anterior (parent_id), así se conservan las versiones sin otra tabla.
--   * build_components: las piezas, con copia de nombre, SKU y precio al
--     guardar. Las piezas demo no existen en la base: se guarda su id de código.
--   * Nadie lee las tablas directamente: get_build(código) devuelve una sola
--     configuración y save_build() valida y guarda con precios de la base.
-- =============================================================================

create table public.builds (
  id uuid primary key default gen_random_uuid(),
  share_code text not null unique check (share_code ~ '^[A-Za-z0-9]{12}$'),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  mode text not null check (mode in ('guided', 'free')),
  source text not null check (source in ('catalog', 'demo')),
  -- Pesos colombianos enteros.
  budget bigint check (budget between 0 and 200000000),
  total bigint not null check (total >= 0),
  currency text not null default 'COP' check (currency = 'COP'),
  -- Respuestas del modo guiado, si salió de ahí.
  answers jsonb,
  parent_id uuid references public.builds (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.builds is
  'Configuraciones de Kova Architect. Inmutables: guardar de nuevo crea otra fila (parent_id).';

create index builds_created_at_idx on public.builds (created_at);

create table public.build_components (
  build_id uuid not null references public.builds (id) on delete cascade,
  position integer not null check (position between 0 and 20),
  kind text not null
    check (kind in ('cpu', 'motherboard', 'gpu', 'ram', 'storage', 'psu', 'cooler', 'case')),
  product_id uuid references public.products (id) on delete set null,
  demo_part_id text check (demo_part_id ~ '^demo-[a-z0-9-]{1,40}$'),
  name text not null check (char_length(name) between 1 and 200),
  sku text,
  price bigint not null check (price between 0 and 200000000),
  primary key (build_id, position),
  -- Un producto de la tienda o una pieza demo, nunca los dos.
  constraint build_components_one_source check (product_id is null or demo_part_id is null)
);

comment on table public.build_components is
  'Piezas de una configuración con copia de nombre, SKU y precio al guardarla.';

create index build_components_product_idx on public.build_components (product_id);

alter table public.builds enable row level security;
alter table public.build_components enable row level security;

-- Los admins pueden consultarlas (para ver qué arman los clientes); nadie las edita.
create policy builds_admin_select on public.builds
  for select to authenticated using ((select public.is_admin()));
create policy build_components_admin_select on public.build_components
  for select to authenticated using ((select public.is_admin()));

revoke all on public.builds, public.build_components from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.builds, public.build_components from authenticated;

-- -----------------------------------------------------------------------------
-- Guardar. p_build: { name, mode, source, budget, answers, parent_code,
--   components: [{ kind, product_id | demo_part_id, name, price }] }
-- Para productos de la tienda, nombre, SKU y precio salen de la base (no del
-- navegador) y el producto debe estar activo. Devuelve el código del enlace.
-- -----------------------------------------------------------------------------
create or replace function public.save_build(p_build jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_components jsonb := coalesce(p_build -> 'components', '[]'::jsonb);
  v_source text := p_build ->> 'source';
  v_parent uuid;
  v_build uuid;
  v_code text;
  v_item jsonb;
  v_position integer := 0;
  v_product record;
  v_total bigint := 0;
begin
  if jsonb_typeof(v_components) <> 'array'
    or jsonb_array_length(v_components) = 0
    or jsonb_array_length(v_components) > 12 then
    raise exception 'VALIDATION' using errcode = 'P0001';
  end if;

  -- Freno básico contra abuso: como mucho 60 guardados cada 10 minutos en toda la tienda.
  if (select count(*) from public.builds b where b.created_at > now() - interval '10 minutes') >= 60 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  if p_build ? 'parent_code' and p_build ->> 'parent_code' is not null then
    select b.id into v_parent from public.builds b where b.share_code = p_build ->> 'parent_code';
  end if;

  -- 12 caracteres alfanuméricos al azar (62^12 combinaciones): imposibles de adivinar.
  loop
    v_code := array_to_string(array(
      select substr(
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        1 + (get_byte(extensions.gen_random_bytes(1), 0) % 62), 1)
      from generate_series(1, 12)
    ), '');
    exit when not exists (select 1 from public.builds b where b.share_code = v_code);
  end loop;

  insert into public.builds (share_code, name, mode, source, budget, total, answers, parent_id)
  values (
    v_code,
    btrim(coalesce(p_build ->> 'name', '')),
    p_build ->> 'mode',
    v_source,
    nullif(p_build ->> 'budget', '')::bigint,
    0,
    case when jsonb_typeof(p_build -> 'answers') = 'object' then p_build -> 'answers' end,
    v_parent
  )
  returning id into v_build;

  for v_item in select * from jsonb_array_elements(v_components) loop
    if v_source = 'catalog' then
      select p.id, p.name, p.sku, p.price into v_product
      from public.products p
      where p.id = (v_item ->> 'product_id')::uuid and p.is_active;
      if not found then
        raise exception 'PRODUCT_UNAVAILABLE' using errcode = 'P0001';
      end if;
      insert into public.build_components (build_id, position, kind, product_id, name, sku, price)
      values (v_build, v_position, v_item ->> 'kind', v_product.id, v_product.name, v_product.sku, v_product.price);
      v_total := v_total + v_product.price;
    else
      -- Las piezas demo viven en el código: se guardan tal cual, con precio de ejemplo.
      insert into public.build_components (build_id, position, kind, demo_part_id, name, price)
      values (
        v_build, v_position, v_item ->> 'kind', v_item ->> 'demo_part_id',
        left(v_item ->> 'name', 200), (v_item ->> 'price')::bigint
      );
      v_total := v_total + (v_item ->> 'price')::bigint;
    end if;
    v_position := v_position + 1;
  end loop;

  update public.builds set total = v_total where id = v_build;
  return v_code;
end;
$$;

-- Una configuración por su código, con sus piezas en orden. null si no existe.
create or replace function public.get_build(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'code', b.share_code,
    'name', b.name,
    'mode', b.mode,
    'source', b.source,
    'budget', b.budget,
    'total', b.total,
    'answers', b.answers,
    'created_at', b.created_at,
    'parent_code', (select parent.share_code from public.builds parent where parent.id = b.parent_id),
    'components', coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', c.kind,
        'product_id', c.product_id,
        'demo_part_id', c.demo_part_id,
        'name', c.name,
        'sku', c.sku,
        'price', c.price
      ) order by c.position)
      from public.build_components c where c.build_id = b.id
    ), '[]'::jsonb)
  )
  from public.builds b
  where b.share_code = p_code;
$$;

revoke execute on function public.save_build(jsonb) from public;
revoke execute on function public.get_build(text) from public;
grant execute on function public.save_build(jsonb) to anon, authenticated;
grant execute on function public.get_build(text) to anon, authenticated;
