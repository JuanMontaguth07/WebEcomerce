-- =============================================================================
-- Tareas programadas: vencimiento de pedidos pendientes cada 15 minutos.
-- Requiere pg_cron (disponible en Supabase). Si la extensión no existe en el
-- entorno, la migración no hace nada.
-- =============================================================================

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;

    execute $cron$
      select cron.schedule(
        'expire-pending-orders',
        '*/15 * * * *',
        'select public.expire_pending_orders();'
      )
    $cron$;
  end if;
end;
$$;
