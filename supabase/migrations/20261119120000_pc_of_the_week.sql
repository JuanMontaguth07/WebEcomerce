-- =============================================================================
-- «PC de la semana»: una de las PCs armadas se destaca en Arma tu PC con una
-- banda, un texto corto y cuenta regresiva hasta la fecha que elige el admin.
-- Al pasar la fecha deja de mostrarse sola (get_featured_builds no la entrega).
-- Solo una a la vez.
-- =============================================================================

alter table public.featured_builds
  add column spotlight_until timestamptz,
  add column spotlight_note text check (char_length(btrim(spotlight_note)) between 3 and 140);

comment on column public.featured_builds.spotlight_until is
  'Hasta cuándo es la «PC de la semana» (null: no lo es).';

create unique index featured_builds_one_spotlight
  on public.featured_builds ((true)) where spotlight_until is not null;

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
      -- Solo mientras dura: después la banda desaparece sola.
      'spotlight_until', case when f.spotlight_until > now() then f.spotlight_until end,
      'spotlight_note', case when f.spotlight_until > now() then f.spotlight_note end,
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
