-- =============================================================================
-- Consultas del catálogo público: búsqueda, filtros, facetas y sugerencias.
-- Son SECURITY INVOKER: RLS limita los resultados a productos, marcas y
-- categorías activos. Solo best_selling_products es SECURITY DEFINER porque
-- agrega ventas (que los visitantes no pueden leer) y expone únicamente
-- identificadores y cantidades.
-- =============================================================================

-- Productos que cumplen los filtros, con su puntaje de relevancia.
create or replace function public.catalog_matches(
  p_query text default null,
  p_category text default null,
  p_brands text[] default null,
  p_min_price bigint default null,
  p_max_price bigint default null,
  p_in_stock boolean default false,
  p_product_type public.product_type default null,
  p_on_sale boolean default false
)
returns table (product_id uuid, rank real)
language sql
stable
security invoker
set search_path = ''
as $$
  with recursive
  q as (
    select
      nullif(btrim(p_query), '') as raw,
      public.immutable_unaccent(lower(nullif(btrim(p_query), ''))) as norm
  ),
  tsq as (
    select case when q.raw is null then null else websearch_to_tsquery('pg_catalog.spanish', q.norm) end as query
    from q
  ),
  category_tree as (
    select c.id from public.categories c where c.slug = p_category
    union
    select c.id from public.categories c join category_tree t on c.parent_id = t.id
  )
  select
    p.id,
    case when q.raw is null then 0::real
    else (
      ts_rank(p.search_vector, tsq.query) * 2
      + extensions.word_similarity(q.norm, public.immutable_unaccent(lower(p.name)))
      + case
          when p.sku = upper(q.raw) then 3
          when p.sku like upper(q.raw) || '%' then 1
          else 0
        end
    )::real
    end
  from public.products p
  cross join q
  cross join tsq
  where p.is_active
    and (p_category is null or p.category_id in (select id from category_tree))
    and (
      p_brands is null or cardinality(p_brands) = 0
      or p.brand_id in (select b.id from public.brands b where b.slug = any (p_brands))
    )
    and (p_min_price is null or p.price >= p_min_price)
    and (p_max_price is null or p.price <= p_max_price)
    and (not coalesce(p_in_stock, false) or p.stock > 0)
    and (p_product_type is null or p.product_type = p_product_type)
    and (not coalesce(p_on_sale, false) or p.compare_at_price is not null)
    and (
      q.raw is null
      or p.search_vector @@ tsq.query
      or extensions.word_similarity(q.norm, public.immutable_unaccent(lower(p.name))) > 0.45
      or p.sku like upper(q.raw) || '%'
    );
$$;

-- Listado paginado. p_sort: relevance | price_asc | price_desc | newest | name
create or replace function public.catalog_search(
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
    (p.stock > 0) desc,
    p.is_featured desc,
    p.created_at desc,
    p.id
  limit least(greatest(coalesce(p_limit, 24), 1), 60)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- Facetas para los filtros: marcas con conteo y rango de precios. Ignora los
-- filtros de marca y precio para que el usuario pueda cambiarlos.
create or replace function public.catalog_facets(
  p_query text default null,
  p_category text default null,
  p_in_stock boolean default false,
  p_product_type public.product_type default null,
  p_on_sale boolean default false
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with matched as (
    select p.id, p.price, p.brand_id
    from public.catalog_matches(
      p_query, p_category, null, null, null, p_in_stock, p_product_type, p_on_sale
    ) m
    join public.products p on p.id = m.product_id
  )
  select jsonb_build_object(
    'total', (select count(*) from matched),
    'min_price', (select min(price) from matched),
    'max_price', (select max(price) from matched),
    'brands', coalesce((
      select jsonb_agg(jsonb_build_object('slug', b.slug, 'name', b.name, 'count', x.n) order by b.name)
      from (select brand_id, count(*) as n from matched where brand_id is not null group by brand_id) x
      join public.brands b on b.id = x.brand_id
    ), '[]'::jsonb)
  );
$$;

-- Sugerencias del buscador mientras se escribe (coincidencia por prefijo).
create or replace function public.search_suggestions(p_query text, p_limit integer default 6)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select
      nullif(btrim(p_query), '') as raw,
      public.immutable_unaccent(lower(left(nullif(btrim(p_query), ''), 80))) as norm
  ),
  prefix as (
    -- 'rtx 50' -> 'rtx':* & '50':*   (quote_literal evita inyección de sintaxis)
    select to_tsquery(
      'pg_catalog.spanish',
      string_agg(quote_literal(w) || ':*', ' & ')
    ) as query
    from q, regexp_split_to_table(q.norm, '[^a-z0-9ñ]+') as w
    where w <> ''
  ),
  products as (
    select p.name, p.slug, p.sku, p.price, b.name as brand_name,
      img.storage_path as image_path,
      ts_rank(p.search_vector, prefix.query)
        + extensions.word_similarity(q.norm, public.immutable_unaccent(lower(p.name)))
        + case when p.sku like upper(q.raw) || '%' then 2 else 0 end as rank
    from public.products p
    cross join q
    cross join prefix
    left join public.brands b on b.id = p.brand_id
    left join lateral (
      select pi.storage_path from public.product_images pi
      where pi.product_id = p.id order by pi.position limit 1
    ) img on true
    where p.is_active
      and q.raw is not null
      and (
        p.search_vector @@ prefix.query
        or p.sku like upper(q.raw) || '%'
        or extensions.word_similarity(q.norm, public.immutable_unaccent(lower(p.name))) > 0.5
      )
    order by rank desc, (p.stock > 0) desc, p.name
    limit least(greatest(coalesce(p_limit, 6), 1), 10)
  )
  select jsonb_build_object(
    'products', coalesce((select jsonb_agg(to_jsonb(products) - 'rank') from products), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('name', c.name, 'slug', c.slug))
      from (
        select c.name, c.slug from public.categories c, q
        where q.raw is not null
          and public.immutable_unaccent(lower(c.name)) like '%' || q.norm || '%'
        order by c.position, c.name limit 3
      ) c
    ), '[]'::jsonb),
    'brands', coalesce((
      select jsonb_agg(jsonb_build_object('name', b.name, 'slug', b.slug))
      from (
        select b.name, b.slug from public.brands b, q
        where q.raw is not null
          and public.immutable_unaccent(lower(b.name)) like q.norm || '%'
        order by b.name limit 3
      ) b
    ), '[]'::jsonb)
  );
$$;

-- Más vendidos de los últimos 90 días (pedidos no cancelados). Sin ventas
-- no devuelve filas: la home oculta la sección en lugar de inventarla.
create or replace function public.best_selling_products(p_limit integer default 8)
returns table (product_id uuid, units bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select oi.product_id, sum(oi.quantity)::bigint as units
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.products p on p.id = oi.product_id
  where o.status <> 'cancelled'
    and o.created_at > now() - interval '90 days'
    and p.is_active
  group by oi.product_id
  order by units desc
  limit least(greatest(coalesce(p_limit, 8), 1), 24);
$$;

revoke execute on function public.catalog_matches(text, text, text[], bigint, bigint, boolean, public.product_type, boolean) from public;
revoke execute on function public.catalog_search(text, text, text[], bigint, bigint, boolean, public.product_type, boolean, text, integer, integer) from public;
revoke execute on function public.catalog_facets(text, text, boolean, public.product_type, boolean) from public;
revoke execute on function public.search_suggestions(text, integer) from public;
revoke execute on function public.best_selling_products(integer) from public;

grant execute on function public.catalog_matches(text, text, text[], bigint, bigint, boolean, public.product_type, boolean) to anon, authenticated;
grant execute on function public.catalog_search(text, text, text[], bigint, bigint, boolean, public.product_type, boolean, text, integer, integer) to anon, authenticated;
grant execute on function public.catalog_facets(text, text, boolean, public.product_type, boolean) to anon, authenticated;
grant execute on function public.search_suggestions(text, integer) to anon, authenticated;
grant execute on function public.best_selling_products(integer) to anon, authenticated;
