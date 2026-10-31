-- =============================================================================
-- Catálogo de referencia grande: una pieza de referencia puede no tener precio
-- propio. Su precio sale de las ofertas en otras tiendas (o de los botones de
-- búsqueda) y en Arma tu PC muestra «Ver precios en tiendas». Lo que se vende
-- aquí sigue necesitando precio.
--   * products.price deja de ser obligatorio solo para las piezas de referencia.
--   * save_build guarda 0 para una pieza sin precio (la foto del total).
--   * get_featured_builds suma cada pieza con su mejor precio de hoy: el de la
--     tienda, o la oferta más barata en pesos si es de referencia.
-- =============================================================================

alter table public.products
  alter column price drop not null,
  add constraint products_price_required check (price is not null or is_reference);

comment on column public.products.price is
  'Precio en COP. Opcional solo en piezas de referencia (su precio sale de las ofertas).';

-- Precio en pesos de la oferta más barata de una pieza (las de dólares, con la
-- tasa de la tienda; sin tasa no cuentan). null si ninguna tiene precio.
create or replace function private.best_offer_cop(p_product uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select min(
    case
      when o.currency = 'COP' then o.price
      else round(o.price * (select s.usd_cop_rate from public.store_settings s limit 1))::bigint
    end
  )
  from public.product_offers o
  where o.product_id = p_product and o.price is not null;
$$;

revoke execute on function private.best_offer_cop(uuid) from public;

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
      select p.id, p.name, p.sku, coalesce(p.price, 0) as price into v_product
      from public.products p
      where p.id = (v_item ->> 'product_id')::uuid and (p.is_active or p.is_reference);
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

create or replace function public.get_featured_builds()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with parts as (
    select
      c.build_id,
      c.position,
      c.kind,
      coalesce(p.name, c.name) as name,
      -- Precio de hoy: el de la tienda; en una de referencia, la oferta más
      -- barata (o su precio de referencia); si ya no existe, el que se guardó.
      case
        when p.id is null then nullif(c.price, 0)
        when p.is_reference then coalesce(private.best_offer_cop(p.id), p.price)
        else p.price
      end as price,
      p.id is not null or c.demo_part_id is not null as available
    from public.build_components c
    left join public.products p
      on p.id = c.product_id and (p.is_active or p.is_reference)
  )
  select coalesce(jsonb_agg(item order by (item ->> 'position')::integer, item ->> 'title'), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', f.id,
      'title', f.title,
      'tag', f.tag,
      'description', f.description,
      'position', f.position,
      'code', b.share_code,
      'source', b.source,
      'total', (select coalesce(sum(x.price), 0) from parts x where x.build_id = b.id),
      'unpriced', (select count(*) from parts x where x.build_id = b.id and x.price is null),
      'components', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'kind', x.kind,
          'name', x.name,
          'price', x.price,
          'available', x.available
        ) order by x.position), '[]'::jsonb)
        from parts x
        where x.build_id = b.id
      )
    ) as item
    from public.featured_builds f
    join public.builds b on b.id = f.build_id
    where f.is_active
  ) rows;
$$;

revoke execute on function public.get_featured_builds() from public;
grant execute on function public.get_featured_builds() to anon, authenticated;
