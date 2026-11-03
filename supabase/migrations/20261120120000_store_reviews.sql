-- =============================================================================
-- Opiniones de compradores verificados.
--   * Solo opina quien compró: desde el enlace privado de su pedido (el token)
--     y cuando el pedido ya fue entregado. Una opinión por pedido; mientras no
--     la revisen la puede corregir.
--   * Nada sale publicado sin que un administrador la apruebe.
--   * El público solo lee las aprobadas, sin datos del pedido: nombre que eligió
--     mostrar, ciudad (si quiso), estrellas, texto y fecha.
-- =============================================================================

create table public.store_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(btrim(body)) between 10 and 600),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 40),
  -- Copia de la ciudad del pedido solo si el cliente quiso mostrarla.
  city text check (char_length(city) <= 80),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.store_reviews is
  'Opiniones de compradores (desde su pedido entregado); se publican solo aprobadas.';

create index store_reviews_status_idx on public.store_reviews (status, created_at desc);

create trigger store_reviews_set_updated_at
  before update on public.store_reviews
  for each row execute function public.set_updated_at();

alter table public.store_reviews enable row level security;

create policy store_reviews_admin_select on public.store_reviews
  for select to authenticated using ((select public.is_admin()));

revoke all on public.store_reviews from anon;
revoke insert, update, delete, truncate, references, trigger on public.store_reviews from authenticated;

alter table public.admin_alerts drop constraint admin_alerts_kind_check;
alter table public.admin_alerts add constraint admin_alerts_kind_check
  check (kind in ('order_new', 'order_status', 'stock_low', 'stock_out', 'payment_receipt', 'review_new'));

-- -----------------------------------------------------------------------------
-- Opinar (cliente, con el token de su pedido)
-- -----------------------------------------------------------------------------

create or replace function public.submit_store_review(
  p_order_id uuid,
  p_token text,
  p_rating integer,
  p_body text,
  p_name text,
  p_show_city boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
  v_review record;
  v_id uuid;
begin
  select id, order_number, status, city into v_order
  from public.orders
  where id = p_order_id
    and p_token is not null
    and access_token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_order.status <> 'delivered' then
    raise exception 'NOT_DELIVERED' using errcode = 'P0001';
  end if;
  if p_rating is null or p_rating not between 1 and 5
    or char_length(btrim(coalesce(p_body, ''))) not between 10 and 600
    or char_length(btrim(coalesce(p_name, ''))) not between 2 and 40 then
    raise exception 'VALIDATION' using errcode = 'P0001';
  end if;

  select id, status into v_review from public.store_reviews where order_id = p_order_id for update;
  if found and v_review.status <> 'pending' then
    raise exception 'ALREADY_REVIEWED' using errcode = 'P0001';
  end if;

  insert into public.store_reviews (order_id, rating, body, display_name, city)
  values (
    p_order_id, p_rating, btrim(p_body), btrim(p_name),
    case when p_show_city then v_order.city end
  )
  on conflict (order_id) do update
    set rating = excluded.rating, body = excluded.body,
        display_name = excluded.display_name, city = excluded.city
  returning id into v_id;

  -- Solo se avisa la primera vez (una corrección no vuelve a sonar).
  if v_review.id is null then
    insert into public.admin_alerts (kind, title, body, href, actor_id)
    values (
      'review_new',
      format('Opinión nueva · pedido #%s', v_order.order_number),
      format('%s de 5 estrellas · revísala para publicarla', p_rating),
      '/admin/opiniones',
      null
    );
  end if;

  return jsonb_build_object('id', v_id, 'status', 'pending');
end;
$$;

revoke execute on function public.submit_store_review(uuid, text, integer, text, text, boolean) from public;
grant execute on function public.submit_store_review(uuid, text, integer, text, text, boolean)
  to anon, authenticated;

-- La opinión de un pedido (para mostrarla en su página), con el mismo token.
create or replace function public.get_order_review(p_order_id uuid, p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'rating', r.rating,
    'body', r.body,
    'display_name', r.display_name,
    'show_city', r.city is not null,
    'status', r.status
  )
  from public.store_reviews r
  join public.orders o on o.id = r.order_id
  where o.id = p_order_id
    and p_token is not null
    and o.access_token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
$$;

revoke execute on function public.get_order_review(uuid, text) from public;
grant execute on function public.get_order_review(uuid, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Publicadas (público): resumen y las más recientes
-- -----------------------------------------------------------------------------

create or replace function public.get_store_reviews(p_limit integer default 20)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'count', (select count(*) from public.store_reviews where status = 'approved'),
    'average', (
      select round(avg(rating)::numeric, 1) from public.store_reviews where status = 'approved'
    ),
    'items', coalesce((
      select jsonb_agg(item order by item ->> 'created_at' desc)
      from (
        select jsonb_build_object(
          'id', r.id,
          'rating', r.rating,
          'body', r.body,
          'display_name', r.display_name,
          'city', r.city,
          'created_at', r.created_at
        ) as item
        from public.store_reviews r
        where r.status = 'approved'
        order by r.created_at desc
        limit least(greatest(coalesce(p_limit, 20), 1), 50)
      ) rows
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.get_store_reviews(integer) from public;
grant execute on function public.get_store_reviews(integer) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Moderar (administrador)
-- -----------------------------------------------------------------------------

create or replace function public.moderate_store_review(p_review_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_status not in ('approved', 'rejected', 'pending') then
    raise exception 'VALIDATION' using errcode = 'P0001';
  end if;
  update public.store_reviews
  set status = p_status,
      reviewed_by = case when p_status = 'pending' then null else (select auth.uid()) end,
      reviewed_at = case when p_status = 'pending' then null else now() end
  where id = p_review_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.moderate_store_review(uuid, text) from public, anon;
grant execute on function public.moderate_store_review(uuid, text) to authenticated;
