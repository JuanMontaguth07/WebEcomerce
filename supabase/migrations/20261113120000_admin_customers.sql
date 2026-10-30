-- =============================================================================
-- Clientes del panel, armados a partir de los pedidos (la tienda no pide cuenta).
--   * Un cliente es un correo (sin importar mayúsculas ni espacios); su nombre,
--     teléfono y ciudad son los de su pedido más reciente.
--   * «Gastado» cuenta solo pedidos pagados (confirmado en adelante): ni
--     pendientes ni cancelados.
--   * Grupos: recurrentes (2+ compras), nuevos (primer pedido en 30 días) e
--     inactivos (compraron alguna vez y nada en 90 días).
--   * Security invoker: la RLS de orders ya deja leerlos solo a administradores.
-- =============================================================================

create or replace function public.admin_customers(
  p_query text default null,
  p_segment text default null,
  p_sort text default 'spent',
  p_limit integer default 30,
  p_offset integer default 0
)
returns table (
  email text,
  name text,
  phone text,
  city text,
  department text,
  orders integer,
  paid_orders integer,
  pending_orders integer,
  cancelled_orders integer,
  spent bigint,
  first_order_at timestamptz,
  last_order_at timestamptz,
  last_order_id uuid,
  last_order_number bigint,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with grouped as (
    select
      lower(btrim(o.customer_email)) as email,
      (array_agg(o.customer_name order by o.created_at desc))[1] as name,
      (array_agg(o.customer_phone order by o.created_at desc))[1] as phone,
      (array_agg(o.city order by o.created_at desc))[1] as city,
      (array_agg(o.department order by o.created_at desc))[1] as department,
      count(*)::integer as orders,
      count(*) filter (
        where o.status in ('confirmed', 'preparing', 'shipped', 'delivered')
      )::integer as paid_orders,
      count(*) filter (where o.status = 'pending')::integer as pending_orders,
      count(*) filter (where o.status = 'cancelled')::integer as cancelled_orders,
      coalesce(sum(o.total) filter (
        where o.status in ('confirmed', 'preparing', 'shipped', 'delivered')
      ), 0)::bigint as spent,
      min(o.created_at) as first_order_at,
      max(o.created_at) as last_order_at,
      (array_agg(o.id order by o.created_at desc))[1] as last_order_id,
      (array_agg(o.order_number order by o.created_at desc))[1] as last_order_number
    from public.orders o
    group by lower(btrim(o.customer_email))
  ),
  wanted as (
    select * from grouped g
    where (
        nullif(btrim(p_query), '') is null
        or position(lower(btrim(p_query)) in g.email) > 0
        or position(lower(btrim(p_query)) in lower(g.name)) > 0
        -- Por teléfono solo con 4 dígitos o más (si no, casi todo coincidiría).
        or (
          length(regexp_replace(p_query, '\D', '', 'g')) >= 4
          and position(regexp_replace(p_query, '\D', '', 'g') in regexp_replace(g.phone, '\D', '', 'g')) > 0
        )
      )
      and (
        p_segment is null
        or (p_segment = 'frequent' and g.paid_orders >= 2)
        or (p_segment = 'new' and g.first_order_at >= now() - interval '30 days')
        or (p_segment = 'inactive' and g.paid_orders >= 1
            and g.last_order_at < now() - interval '90 days')
      )
  )
  select
    w.email, w.name, w.phone, w.city, w.department, w.orders, w.paid_orders,
    w.pending_orders, w.cancelled_orders, w.spent, w.first_order_at, w.last_order_at,
    w.last_order_id, w.last_order_number, count(*) over () as total_count
  from wanted w
  order by
    case when p_sort = 'orders' then w.paid_orders end desc nulls last,
    case when p_sort = 'recent' then w.last_order_at end desc nulls last,
    w.spent desc,
    w.last_order_at desc
  limit least(greatest(coalesce(p_limit, 30), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- Cifras de arriba de la vista: cuántos hay en cada grupo y el gasto promedio.
create or replace function public.admin_customer_summary()
returns table (
  customers bigint,
  buyers bigint,
  frequent bigint,
  new_30d bigint,
  inactive bigint,
  average_spent bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with grouped as (
    select
      count(*) filter (
        where o.status in ('confirmed', 'preparing', 'shipped', 'delivered')
      ) as paid_orders,
      coalesce(sum(o.total) filter (
        where o.status in ('confirmed', 'preparing', 'shipped', 'delivered')
      ), 0) as spent,
      min(o.created_at) as first_order_at,
      max(o.created_at) as last_order_at
    from public.orders o
    group by lower(btrim(o.customer_email))
  )
  select
    count(*),
    count(*) filter (where paid_orders >= 1),
    count(*) filter (where paid_orders >= 2),
    count(*) filter (where first_order_at >= now() - interval '30 days'),
    count(*) filter (where paid_orders >= 1 and last_order_at < now() - interval '90 days'),
    coalesce(round(avg(spent) filter (where paid_orders >= 1)), 0)::bigint
  from grouped;
$$;

revoke execute on function public.admin_customers(text, text, text, integer, integer) from public, anon;
revoke execute on function public.admin_customer_summary() from public, anon;
grant execute on function public.admin_customers(text, text, text, integer, integer) to authenticated;
grant execute on function public.admin_customer_summary() to authenticated;
