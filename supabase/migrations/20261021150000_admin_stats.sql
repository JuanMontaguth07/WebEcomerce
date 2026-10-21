-- =============================================================================
-- Estadísticas del panel de administración. Solo administradores.
-- Ventas = pedidos no cancelados (en el MVP no hay pagos en línea; cuando se
-- integre una pasarela se podrá distinguir lo cobrado con payment_status).
-- =============================================================================

create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'products_total', (select count(*) from public.products),
    'products_active', (select count(*) from public.products where is_active),
    'out_of_stock', (select count(*) from public.products where is_active and stock = 0),
    'low_stock', (
      select count(*) from public.products
      where is_active and stock > 0 and stock <= low_stock_threshold
    ),
    'orders_pending', (select count(*) from public.orders where status = 'pending'),
    'orders_last_30d', (
      select count(*) from public.orders
      where status <> 'cancelled' and created_at > now() - interval '30 days'
    ),
    'sales_total', (
      select coalesce(sum(total), 0) from public.orders where status <> 'cancelled'
    ),
    'sales_last_30d', (
      select coalesce(sum(total), 0) from public.orders
      where status <> 'cancelled' and created_at > now() - interval '30 days'
    )
  )
  into v_result;

  return v_result;
end;
$$;

revoke execute on function public.admin_dashboard_stats() from public, anon;
grant execute on function public.admin_dashboard_stats() to authenticated;
