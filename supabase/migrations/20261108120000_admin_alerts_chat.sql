-- =============================================================================
-- Alertas en tiempo real y chat entre administradores.
--   * admin_alerts: la base las genera sola (triggers), así no dependen de que
--     alguien tenga el panel abierto: pedido nuevo, cambio de estado, stock
--     bajo y producto agotado. actor_id es quien lo causó (null = cliente o
--     tarea automática); un admin no recibe alertas de lo que él mismo hizo.
--   * admin_messages: chat entre administradores. Solo se escribe como uno mismo.
--   * admin_reads: hasta cuándo leyó cada admin las alertas y el chat.
--   * Ambas tablas se publican en Realtime; la RLS limita la lectura a admins.
-- =============================================================================

create table public.admin_alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null
    check (kind in ('order_new', 'order_status', 'stock_low', 'stock_out')),
  title text not null check (char_length(title) between 1 and 120),
  body text check (char_length(body) <= 300),
  -- Solo rutas del panel.
  href text check (href ~ '^/admin(/[A-Za-z0-9_/-]*)?$'),
  actor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.admin_alerts is
  'Avisos del panel generados por la base (pedidos y stock). actor_id null = cliente o sistema.';

create index admin_alerts_created_at_idx on public.admin_alerts (created_at desc);

create table public.admin_messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

comment on table public.admin_messages is 'Chat entre los administradores de la tienda.';

create index admin_messages_created_at_idx on public.admin_messages (created_at desc);

create table public.admin_reads (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  alerts_read_at timestamptz not null default now(),
  chat_read_at timestamptz not null default now()
);

alter table public.admin_alerts enable row level security;
alter table public.admin_messages enable row level security;
alter table public.admin_reads enable row level security;

create policy admin_alerts_select on public.admin_alerts
  for select to authenticated using ((select public.is_admin()));

create policy admin_messages_select on public.admin_messages
  for select to authenticated using ((select public.is_admin()));
create policy admin_messages_insert on public.admin_messages
  for insert to authenticated
  with check ((select public.is_admin()) and author_id = (select auth.uid()));

create policy admin_reads_select on public.admin_reads
  for select to authenticated using ((select public.is_admin()));

revoke all on public.admin_alerts, public.admin_messages, public.admin_reads from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.admin_alerts, public.admin_reads from authenticated;
revoke update, delete, truncate, references, trigger on public.admin_messages from authenticated;

-- Marcar como leído (alertas o chat) hasta ahora, para el admin que llama.
create or replace function public.mark_admin_read(p_what text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  insert into public.admin_reads (user_id) values (auth.uid())
  on conflict (user_id) do update set
    alerts_read_at = case when p_what = 'alerts' then now() else public.admin_reads.alerts_read_at end,
    chat_read_at = case when p_what = 'chat' then now() else public.admin_reads.chat_read_at end;
end;
$$;

revoke execute on function public.mark_admin_read(text) from public, anon;
grant execute on function public.mark_admin_read(text) to authenticated;

-- -----------------------------------------------------------------------------
-- Generación de alertas
-- -----------------------------------------------------------------------------

create or replace function private.order_status_label(p_status public.order_status)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_status
    when 'pending' then 'pendiente de pago'
    when 'confirmed' then 'confirmado'
    when 'preparing' then 'en preparación'
    when 'shipped' then 'enviado'
    when 'delivered' then 'entregado'
    when 'cancelled' then 'cancelado'
  end;
$$;

create or replace function private.alert_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_items integer;
begin
  if tg_op = 'INSERT' then
    select count(*) into v_items from public.order_items i where i.order_id = new.id;
    insert into public.admin_alerts (kind, title, body, href, actor_id)
    values (
      'order_new',
      'Pedido nuevo #' || new.order_number,
      new.customer_name || ' · $ ' || replace(to_char(new.total, 'FM999,999,999,999'), ',', '.') ||
        case when v_items > 0 then ' · ' || v_items || case when v_items = 1 then ' producto' else ' productos' end else '' end,
      '/admin/pedidos/' || new.id,
      auth.uid()
    );
  elsif new.status is distinct from old.status then
    insert into public.admin_alerts (kind, title, body, href, actor_id)
    values (
      'order_status',
      'Pedido #' || new.order_number || ': ' || private.order_status_label(new.status),
      case
        when auth.uid() is null and new.status = 'cancelled' then 'Venció sin confirmarse el pago; el stock volvió al inventario.'
        else 'Antes estaba ' || private.order_status_label(old.status) || '.'
      end,
      '/admin/pedidos/' || new.id,
      auth.uid()
    );
  end if;
  return null;
end;
$$;

-- El pedido nuevo se avisa al confirmar la transacción: así ya tiene sus productos.
create constraint trigger orders_alert_new
  after insert on public.orders
  deferrable initially deferred
  for each row execute function private.alert_order();

create trigger orders_alert_status
  after update of status on public.orders
  for each row execute function private.alert_order();

create or replace function private.alert_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.stock <= 0 and old.stock > 0 then
    insert into public.admin_alerts (kind, title, body, href, actor_id)
    values ('stock_out', 'Se agotó ' || left(new.name, 100), 'SKU ' || new.sku || ' · ya no se puede comprar.',
            '/admin/productos/' || new.id, auth.uid());
  elsif new.stock > 0 and new.stock <= new.low_stock_threshold and old.stock > new.low_stock_threshold then
    insert into public.admin_alerts (kind, title, body, href, actor_id)
    values ('stock_low', 'Stock bajo: ' || left(new.name, 100),
            'Quedan ' || new.stock || case when new.stock = 1 then ' unidad' else ' unidades' end || ' · SKU ' || new.sku,
            '/admin/productos/' || new.id, auth.uid());
  end if;
  return null;
end;
$$;

create trigger products_alert_stock
  after update of stock on public.products
  for each row execute function private.alert_stock();

revoke execute on function private.alert_order() from public, anon, authenticated;
revoke execute on function private.alert_stock() from public, anon, authenticated;
revoke execute on function private.order_status_label(public.order_status) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Tiempo real y limpieza
-- -----------------------------------------------------------------------------

alter publication supabase_realtime add table public.admin_alerts, public.admin_messages;

-- Las alertas sirven unos días; el chat se conserva. Si pg_cron no existe, no se programa.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $cron$
      select cron.schedule(
        'prune-admin-alerts',
        '30 4 * * *',
        $job$delete from public.admin_alerts where created_at < now() - interval '60 days'$job$
      )
    $cron$;
  end if;
end;
$$;
