-- =============================================================================
-- Filtros por especificación en el catálogo.
--   * Las especificaciones marcadas «Filtrable» en la ficha de una categoría se
--     pueden filtrar: p_specs = {"vram": ["12", "16"], "socket": ["am5"]}.
--     Dentro de una especificación se combina con «o»; entre ellas, con «y».
--   * catalog_spec_facets(): valores de cada especificación filtrable con su
--     conteo, aplicando los demás filtros (como las marcas).
--   * catalog_matches, catalog_search y catalog_facets reciben p_specs al final
--     (con valor por defecto): cambian su firma y se recrean.
-- =============================================================================

-- Valor comparable de una especificación: números sin ceros sobrantes («12»,
-- «5.3»), booleanos «true»/«false» y textos en minúsculas sin espacios extremos.
create or replace function public.spec_value_key(
  p_data_type public.spec_data_type,
  p_text text,
  p_number numeric,
  p_boolean boolean
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_data_type
    when 'number' then trim_scale(p_number)::text
    when 'boolean' then p_boolean::text
    else lower(btrim(p_text))
  end;
$$;

drop function public.catalog_facets(text, text, boolean, public.product_type, boolean);
drop function public.catalog_search(
  text, text, text[], bigint, bigint, boolean, public.product_type, boolean, text, integer, integer
);
drop function public.catalog_matches(
  text, text, text[], bigint, bigint, boolean, public.product_type, boolean
);

create function public.catalog_matches(
  p_query text default null,
  p_category text default null,
  p_brands text[] default null,
  p_min_price bigint default null,
  p_max_price bigint default null,
  p_in_stock boolean default false,
  p_product_type public.product_type default null,
  p_on_sale boolean default false,
  p_specs jsonb default null
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
  ),
  -- Filtros por especificación válidos: clave → lista de valores en minúsculas.
  spec_filters as (
    select f.key, array(select lower(v) from jsonb_array_elements_text(f.vals) v) as vals
    from jsonb_each(case when jsonb_typeof(p_specs) = 'object' then p_specs else '{}'::jsonb end) f(key, vals)
    where jsonb_typeof(f.vals) = 'array' and jsonb_array_length(f.vals) > 0
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
    )
    -- Cada especificación filtrada debe tener alguno de los valores elegidos.
    and not exists (
      select 1 from spec_filters f
      where not exists (
        select 1
        from public.product_specs ps
        join public.spec_definitions sd on sd.id = ps.spec_id
        where ps.product_id = p.id
          and sd.key = f.key
          and public.spec_value_key(sd.data_type, ps.value_text, ps.value_number, ps.value_boolean) = any (f.vals)
      )
    );
$$;

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
  p_offset integer default 0,
  p_specs jsonb default null
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
    p_query, p_category, p_brands, p_min_price, p_max_price, p_in_stock, p_product_type, p_on_sale, p_specs
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

create function public.catalog_facets(
  p_query text default null,
  p_category text default null,
  p_in_stock boolean default false,
  p_product_type public.product_type default null,
  p_on_sale boolean default false,
  p_specs jsonb default null
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
      p_query, p_category, null, null, null, p_in_stock, p_product_type, p_on_sale, p_specs
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

-- Especificaciones filtrables de la categoría (y sus subcategorías) con sus
-- valores y cuántos productos tiene cada uno. Cada conteo aplica todos los
-- filtros salvo el de esa misma especificación, para poder sumar opciones.
-- Sin categoría devuelve una lista vacía: las fichas cambian según la categoría.
create function public.catalog_spec_facets(
  p_query text default null,
  p_category text default null,
  p_brands text[] default null,
  p_min_price bigint default null,
  p_max_price bigint default null,
  p_in_stock boolean default false,
  p_product_type public.product_type default null,
  p_on_sale boolean default false,
  p_specs jsonb default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with recursive
  category_tree as (
    select c.id from public.categories c where c.slug = p_category
    union
    select c.id from public.categories c join category_tree t on c.parent_id = t.id
  ),
  defs as (
    select distinct on (sd.key) sd.key, sd.label, sd.unit, sd.data_type, sd.position
    from public.spec_definitions sd
    where sd.is_filterable and sd.category_id in (select id from category_tree)
    order by sd.key, sd.position, sd.label
  ),
  facets as (
    select
      d.key, d.label, d.unit, d.data_type, d.position,
      coalesce(p_specs, '{}'::jsonb) ? d.key as selected,
      (
        select coalesce(jsonb_agg(
          jsonb_build_object('value', v.value, 'label', v.label, 'count', v.n)
          order by v.number nulls last, v.n desc, v.label
        ), '[]'::jsonb)
        from (
          select
            public.spec_value_key(sd.data_type, ps.value_text, ps.value_number, ps.value_boolean) as value,
            min(btrim(ps.value_text)) as label,
            max(ps.value_number) as number,
            count(distinct ps.product_id) as n
          from public.catalog_matches(
            p_query, p_category, p_brands, p_min_price, p_max_price, p_in_stock, p_product_type,
            p_on_sale, case when jsonb_typeof(p_specs) = 'object' then p_specs - d.key end
          ) m
          join public.product_specs ps on ps.product_id = m.product_id
          join public.spec_definitions sd on sd.id = ps.spec_id and sd.key = d.key
          where public.spec_value_key(sd.data_type, ps.value_text, ps.value_number, ps.value_boolean) is not null
          group by 1
          order by max(ps.value_number) nulls last, count(distinct ps.product_id) desc
          limit 20
        ) v
      ) as options
    from defs d
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'key', f.key, 'label', f.label, 'unit', f.unit, 'data_type', f.data_type, 'values', f.options
    ) order by f.position, f.key
  ), '[]'::jsonb)
  from facets f
  -- Solo sirve filtrar si hay al menos dos opciones (o si ya se está filtrando).
  where p_category is not null and (jsonb_array_length(f.options) > 1 or f.selected);
$$;

revoke execute on function public.spec_value_key(public.spec_data_type, text, numeric, boolean) from public;
grant execute on function public.spec_value_key(public.spec_data_type, text, numeric, boolean) to anon, authenticated;

revoke execute on function public.catalog_matches(
  text, text, text[], bigint, bigint, boolean, public.product_type, boolean, jsonb
) from public;
grant execute on function public.catalog_matches(
  text, text, text[], bigint, bigint, boolean, public.product_type, boolean, jsonb
) to anon, authenticated;

revoke execute on function public.catalog_search(
  text, text, text[], bigint, bigint, boolean, public.product_type, boolean, text, integer, integer, jsonb
) from public;
grant execute on function public.catalog_search(
  text, text, text[], bigint, bigint, boolean, public.product_type, boolean, text, integer, integer, jsonb
) to anon, authenticated;

revoke execute on function public.catalog_facets(
  text, text, boolean, public.product_type, boolean, jsonb
) from public;
grant execute on function public.catalog_facets(
  text, text, boolean, public.product_type, boolean, jsonb
) to anon, authenticated;

revoke execute on function public.catalog_spec_facets(
  text, text, text[], bigint, bigint, boolean, public.product_type, boolean, jsonb
) from public;
grant execute on function public.catalog_spec_facets(
  text, text, text[], bigint, bigint, boolean, public.product_type, boolean, jsonb
) to anon, authenticated;
