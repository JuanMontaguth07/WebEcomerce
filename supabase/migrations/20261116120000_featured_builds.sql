-- =============================================================================
-- PCs ya armadas de Arma tu PC: configuraciones guardadas que el admin marca
-- como recomendadas, con título, etiqueta («Gamer 1080p»), descripción y orden.
--   * La configuración sigue siendo inmutable (builds); esto solo la destaca.
--   * get_featured_builds() las entrega al público con sus piezas y el total a
--     precios de hoy (si la pieza sigue en la tienda o es de referencia; si no,
--     el precio con que se guardó).
-- =============================================================================

create table public.featured_builds (
  id uuid primary key default gen_random_uuid(),
  build_id uuid not null unique references public.builds (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 60),
  tag text check (char_length(btrim(tag)) between 2 and 30),
  description text check (char_length(description) <= 240),
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.featured_builds is
  'Configuraciones de Arma tu PC recomendadas por la tienda (PCs ya armadas).';

create index featured_builds_position_idx on public.featured_builds (position) where is_active;

create trigger featured_builds_set_updated_at
  before update on public.featured_builds
  for each row execute function public.set_updated_at();

alter table public.featured_builds enable row level security;

create policy featured_builds_admin_select on public.featured_builds
  for select to authenticated using ((select public.is_admin()));
create policy featured_builds_admin_insert on public.featured_builds
  for insert to authenticated with check ((select public.is_admin()));
create policy featured_builds_admin_update on public.featured_builds
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy featured_builds_admin_delete on public.featured_builds
  for delete to authenticated using ((select public.is_admin()));

revoke all on public.featured_builds from anon;

create or replace function public.get_featured_builds()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
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
      'total', (
        select coalesce(sum(coalesce(p.price, c.price)), 0)
        from public.build_components c
        left join public.products p
          on p.id = c.product_id and (p.is_active or p.is_reference)
        where c.build_id = b.id
      ),
      'components', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'kind', c.kind,
          'name', coalesce(p.name, c.name),
          'price', coalesce(p.price, c.price),
          'available', p.id is not null or c.demo_part_id is not null
        ) order by c.position), '[]'::jsonb)
        from public.build_components c
        left join public.products p
          on p.id = c.product_id and (p.is_active or p.is_reference)
        where c.build_id = b.id
      )
    ) as item
    from public.featured_builds f
    join public.builds b on b.id = f.build_id
    where f.is_active
  ) rows;
$$;

revoke execute on function public.get_featured_builds() from public;
grant execute on function public.get_featured_builds() to anon, authenticated;
