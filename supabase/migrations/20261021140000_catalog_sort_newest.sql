-- =============================================================================
-- catalog_search: el orden 'newest' prioriza la fecha de creación por encima
-- de la disponibilidad (antes solo la usaba como desempate).
-- =============================================================================

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
    case when p_sort = 'newest' then p.created_at end desc,
    (p.stock > 0) desc,
    p.is_featured desc,
    p.created_at desc,
    p.id
  limit least(greatest(coalesce(p_limit, 24), 1), 60)
  offset greatest(coalesce(p_offset, 0), 0);
$$;
