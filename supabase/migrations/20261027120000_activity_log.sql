-- =============================================================================
-- Historial general del panel y borrado de productos con historial.
--   * audit_log: registro inmutable de todo cambio hecho en la tienda
--     (catálogo, pedidos, inventario manual, envíos y configuración). Lo
--     llenan triggers y funciones; nadie lo edita ni lo borra.
--   * Los productos con pedidos o movimientos ya se pueden eliminar: las
--     líneas de pedido y los movimientos conservan nombre y SKU, y quedan
--     desvinculados (product_id NULL) en lugar de impedir el borrado.
--   * delete_product: borrado con motivo; deja el inventario en cero con un
--     movimiento y rechaza productos en pedidos sin cerrar.
--   * set_order_shipping: fija el envío "por confirmar" y recalcula el total.
--   * duplicate_product y más indicadores para el resumen del panel.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Historial
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  -- Sin clave foránea: el historial no cambia aunque se borre el usuario.
  actor_id uuid,
  actor_label text check (char_length(actor_label) <= 200),
  entity text not null check (entity in (
    'product', 'product_image', 'product_specs', 'category', 'spec_definition', 'brand',
    'order', 'inventory', 'shipping_rate', 'store_settings'
  )),
  action text not null check (action in ('create', 'update', 'delete')),
  -- Objeto principal afectado (el producto de una imagen, la categoría de una especificación).
  entity_id text,
  entity_label text check (char_length(entity_label) <= 300),
  -- update: { campo: { old, new } }. create/delete: copia de los campos.
  changes jsonb,
  reason text check (char_length(reason) <= 500)
);

comment on table public.audit_log is
  'Historial inmutable de cambios del panel y de la tienda. Solo lectura para administradores.';

create index audit_log_occurred_idx on public.audit_log (occurred_at desc, id desc);
create index audit_log_entity_idx on public.audit_log (entity_id, occurred_at desc);
create index audit_log_entity_type_idx on public.audit_log (entity, occurred_at desc);

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon;
revoke insert, update, delete, truncate on public.audit_log from authenticated;

create policy audit_log_select_admin on public.audit_log
  for select to authenticated
  using ((select public.is_admin()));

create or replace function private.audit_log_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'AUDIT_LOG_IMMUTABLE' using errcode = 'P0001';
end;
$$;

create trigger audit_log_immutable
  before update or delete on public.audit_log
  for each row execute function private.audit_log_immutable();

-- Escribe una entrada. El motivo puede llegar como argumento o, para cambios
-- hechos por triggers, en la variable de transacción app.audit_reason.
create or replace function private.write_audit(
  p_entity text,
  p_action text,
  p_entity_id text,
  p_label text,
  p_changes jsonb,
  p_reason text default null,
  p_actor uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := coalesce(p_actor, (select auth.uid()));
begin
  insert into public.audit_log (actor_id, actor_label, entity, action, entity_id, entity_label, changes, reason)
  values (
    v_actor,
    (select left(coalesce(p.full_name, p.email), 200) from public.profiles p where p.id = v_actor),
    p_entity,
    p_action,
    p_entity_id,
    left(p_label, 300),
    p_changes,
    left(coalesce(
      nullif(btrim(p_reason), ''),
      nullif(btrim(current_setting('app.audit_reason', true)), '')
    ), 500)
  );
end;
$$;

-- Trigger genérico para tablas del catálogo, envíos y configuración.
-- TG_ARGV[0] = entidad. En ediciones solo registra los campos que cambiaron;
-- columnas técnicas (fechas, vector de búsqueda, stock, posición) se ignoran.
create or replace function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entity text := tg_argv[0];
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_ignored text[] := array['id', 'created_at', 'updated_at', 'search_vector', 'stock', 'city_key'];
  v_entity_id text := v_row ->> 'id';
  v_label text := v_row ->> 'name';
  v_changes jsonb;
begin
  if v_entity = 'product_image' then
    v_ignored := v_ignored || array['product_id', 'position', 'width', 'height'];
    v_entity_id := v_row ->> 'product_id';
    select p.name into v_label from public.products p where p.id = (v_row ->> 'product_id')::uuid;
    -- Borrado en cascada del producto: ya queda registrado el borrado del producto.
    if not found then
      return null;
    end if;
  elsif v_entity = 'spec_definition' then
    v_ignored := v_ignored || array['category_id'];
    v_entity_id := v_row ->> 'category_id';
    select c.name || ' · ' || (v_row ->> 'label') into v_label
    from public.categories c where c.id = (v_row ->> 'category_id')::uuid;
    if not found then
      return null;
    end if;
  elsif v_entity = 'shipping_rate' then
    v_label := (v_row ->> 'department') || coalesce(' · ' || (v_row ->> 'city'), '');
  elsif v_entity = 'store_settings' then
    v_entity_id := null;
    v_label := 'Configuración de la tienda';
  end if;

  if tg_op = 'UPDATE' then
    select jsonb_object_agg(n.key, jsonb_build_object('old', o.value, 'new', n.value))
    into v_changes
    from jsonb_each(v_new) n
    join jsonb_each(v_old) o on o.key = n.key
    where n.value is distinct from o.value
      and n.key <> all (v_ignored);

    if v_changes is null then
      return null;
    end if;
  else
    select jsonb_object_agg(e.key, e.value)
    into v_changes
    from jsonb_each(v_row) e
    where e.key <> all (v_ignored)
      and e.value <> 'null'::jsonb;
  end if;

  perform private.write_audit(
    v_entity,
    case tg_op when 'INSERT' then 'create' when 'UPDATE' then 'update' else 'delete' end,
    v_entity_id,
    v_label,
    v_changes
  );
  return null;
end;
$$;

create trigger products_audit
  after insert or update or delete on public.products
  for each row execute function private.audit_row_change('product');
create trigger product_images_audit
  after insert or update or delete on public.product_images
  for each row execute function private.audit_row_change('product_image');
create trigger categories_audit
  after insert or update or delete on public.categories
  for each row execute function private.audit_row_change('category');
create trigger spec_definitions_audit
  after insert or update or delete on public.spec_definitions
  for each row execute function private.audit_row_change('spec_definition');
create trigger brands_audit
  after insert or update or delete on public.brands
  for each row execute function private.audit_row_change('brand');
create trigger shipping_rates_audit
  after insert or update or delete on public.shipping_rates
  for each row execute function private.audit_row_change('shipping_rate');
create trigger store_settings_audit
  after update on public.store_settings
  for each row execute function private.audit_row_change('store_settings');

-- Pedidos: cada entrada del historial de estados queda también en el general.
create or replace function private.audit_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = new.order_id;

  if new.from_status is null then
    perform private.write_audit(
      'order', 'create', new.order_id::text, '#' || v_order.order_number,
      jsonb_build_object(
        'status', new.to_status,
        'customer_name', v_order.customer_name,
        'city', v_order.city,
        'total', v_order.total
      ),
      null,
      new.changed_by
    );
  else
    perform private.write_audit(
      'order', 'update', new.order_id::text, '#' || v_order.order_number,
      jsonb_build_object('status', jsonb_build_object('old', new.from_status, 'new', new.to_status)),
      new.note,
      new.changed_by
    );
  end if;
  return null;
end;
$$;

create trigger order_status_history_audit
  after insert on public.order_status_history
  for each row execute function private.audit_order_status();

-- -----------------------------------------------------------------------------
-- Productos eliminables: las referencias guardan nombre y SKU
-- -----------------------------------------------------------------------------
alter table public.inventory_movements
  add column product_name text,
  add column product_sku text;

update public.inventory_movements m
set product_name = p.name, product_sku = p.sku
from public.products p
where p.id = m.product_id;

alter table public.inventory_movements
  alter column product_name set not null,
  alter column product_sku set not null;

alter table public.inventory_movements
  drop constraint inventory_movements_product_id_fkey,
  alter column product_id drop not null,
  add constraint inventory_movements_product_id_fkey
    foreign key (product_id) references public.products (id) on delete set null;

alter table public.order_items
  drop constraint order_items_product_id_fkey,
  alter column product_id drop not null,
  add constraint order_items_product_id_fkey
    foreign key (product_id) references public.products (id) on delete set null;

comment on column public.products.is_active is
  'Falso = borrador u oculto. Al eliminar, pedidos y movimientos conservan nombre y SKU.';
comment on column public.inventory_movements.product_id is
  'NULL si el producto se eliminó; product_name y product_sku conservan la referencia.';
comment on column public.order_items.product_id is
  'NULL si el producto se eliminó; product_name y sku son la copia del momento de compra.';

create or replace function private.inventory_movement_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.product_name is null or new.product_sku is null then
    select p.name, p.sku into new.product_name, new.product_sku
    from public.products p where p.id = new.product_id;
  end if;
  return new;
end;
$$;

create trigger inventory_movements_snapshot
  before insert on public.inventory_movements
  for each row execute function private.inventory_movement_snapshot();

-- Los movimientos de ventas y cancelaciones ya quedan en el pedido; aquí solo
-- los manuales (cargas, ajustes, devoluciones y bajas por borrado).
create or replace function private.audit_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.order_id is not null then
    return null;
  end if;

  perform private.write_audit(
    'inventory', 'create', new.product_id::text, new.product_name,
    jsonb_build_object(
      'movement_type', new.movement_type,
      'quantity', new.quantity,
      'previous_stock', new.previous_stock,
      'resulting_stock', new.resulting_stock,
      'sku', new.product_sku
    ),
    new.reason,
    new.created_by
  );
  return null;
end;
$$;

create trigger inventory_movements_audit
  after insert on public.inventory_movements
  for each row execute function private.audit_inventory_movement();

-- Borra un producto aunque tenga historial. Devuelve el slug y las rutas de
-- imagen para que la aplicación limpie Storage y la caché.
create or replace function public.delete_product(p_product_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products%rowtype;
  v_open text;
  v_images jsonb;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if char_length(v_reason) > 500 then
    raise exception 'VALIDATION' using errcode = 'P0001';
  end if;

  select * into v_product from public.products where id = p_product_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  -- Un pedido sin cerrar todavía necesita el producto (despacho o devolución de stock).
  select string_agg('#' || o.order_number, ', ' order by o.order_number)
  into v_open
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.product_id = p_product_id
    and o.status in ('pending', 'confirmed', 'preparing', 'shipped');

  if v_open is not null then
    raise exception 'PRODUCT_IN_OPEN_ORDERS' using errcode = 'P0001', detail = v_open;
  end if;

  perform set_config('app.audit_reason', coalesce(v_reason, ''), true);

  -- Las unidades salen del inventario con su movimiento antes de borrar.
  if v_product.stock > 0 then
    insert into public.inventory_movements (
      product_id, movement_type, quantity, previous_stock, resulting_stock, reason, created_by
    )
    values (
      p_product_id, 'adjustment', -v_product.stock, v_product.stock, 0,
      left('Producto eliminado' || coalesce(': ' || v_reason, ''), 300), (select auth.uid())
    );
  end if;

  select coalesce(jsonb_agg(pi.storage_path), '[]'::jsonb) into v_images
  from public.product_images pi where pi.product_id = p_product_id;

  delete from public.products where id = p_product_id;

  perform set_config('app.audit_reason', '', true);

  return jsonb_build_object('slug', v_product.slug, 'images', v_images);
end;
$$;

-- Copia un producto como borrador oculto (sin imágenes ni stock).
create or replace function public.duplicate_product(p_product_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_source public.products%rowtype;
  v_slug text;
  v_sku text;
  v_attempt integer := 1;
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_source from public.products where id = p_product_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  loop
    v_slug := left(v_source.slug, 100) || '-copia' || case when v_attempt > 1 then '-' || v_attempt else '' end;
    v_sku := left(v_source.sku, 50) || '-COPIA' || case when v_attempt > 1 then v_attempt::text else '' end;
    exit when not exists (
      select 1 from public.products p where p.slug = v_slug or p.sku = v_sku
    );
    v_attempt := v_attempt + 1;
  end loop;

  insert into public.products (
    name, slug, sku, product_type, short_description, description, price, compare_at_price,
    brand_id, category_id, low_stock_threshold, warranty_months, is_active, is_featured,
    seo_title, seo_description
  )
  values (
    left(v_source.name, 190) || ' (copia)', v_slug, v_sku, v_source.product_type,
    v_source.short_description, v_source.description, v_source.price, v_source.compare_at_price,
    v_source.brand_id, v_source.category_id, v_source.low_stock_threshold, v_source.warranty_months,
    false, false, v_source.seo_title, v_source.seo_description
  )
  returning id into v_id;

  insert into public.product_specs (product_id, spec_id, value_text, value_number, value_boolean)
  select v_id, ps.spec_id, ps.value_text, ps.value_number, ps.value_boolean
  from public.product_specs ps
  where ps.product_id = p_product_id;

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Ficha técnica: un solo registro con lo que cambió
-- -----------------------------------------------------------------------------
create or replace function private.product_spec_map(p_product_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(
    sd.label || coalesce(' (' || sd.unit || ')', ''),
    coalesce(to_jsonb(ps.value_text), to_jsonb(ps.value_number), to_jsonb(ps.value_boolean))
  ), '{}'::jsonb)
  from public.product_specs ps
  join public.spec_definitions sd on sd.id = ps.spec_id
  where ps.product_id = p_product_id;
$$;

-- SECURITY DEFINER para poder escribir el historial; el control de acceso es is_admin().
create or replace function public.set_product_specs(p_product_id uuid, p_specs jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_changes jsonb;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if jsonb_typeof(p_specs) is distinct from 'array' then
    raise exception 'VALIDATION' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  v_before := private.product_spec_map(p_product_id);

  delete from public.product_specs where product_id = p_product_id;

  insert into public.product_specs (product_id, spec_id, value_text, value_number, value_boolean)
  select
    p_product_id,
    sd.id,
    case when sd.data_type = 'text' then btrim(e ->> 'value') end,
    case when sd.data_type = 'number' then (e ->> 'value')::numeric end,
    case when sd.data_type = 'boolean' then (e ->> 'value')::boolean end
  from jsonb_array_elements(p_specs) as e
  join public.spec_definitions sd on sd.id = (e ->> 'spec_id')::uuid
  where nullif(btrim(e ->> 'value'), '') is not null;

  v_after := private.product_spec_map(p_product_id);

  select jsonb_object_agg(k.key, jsonb_build_object('old', v_before -> k.key, 'new', v_after -> k.key))
  into v_changes
  from (
    select jsonb_object_keys(v_before) as key
    union
    select jsonb_object_keys(v_after)
  ) k
  where (v_before -> k.key) is distinct from (v_after -> k.key);

  if v_changes is not null then
    perform private.write_audit(
      'product_specs', 'update', p_product_id::text,
      (select p.name from public.products p where p.id = p_product_id),
      v_changes
    );
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Envío por confirmar: el admin fija el valor y el total se recalcula
-- -----------------------------------------------------------------------------
create or replace function public.set_order_shipping(
  p_order_id uuid,
  p_shipping_cost bigint,
  p_note text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_total bigint;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_shipping_cost is null or p_shipping_cost < 0 or p_shipping_cost > 100000000 then
    raise exception 'VALIDATION' using errcode = 'P0001';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_order.status not in ('pending', 'confirmed', 'preparing') then
    raise exception 'ORDER_LOCKED' using errcode = 'P0001';
  end if;

  v_total := v_order.subtotal + p_shipping_cost;

  if v_order.shipping_cost is not distinct from p_shipping_cost then
    return v_total;
  end if;

  update public.orders
  set shipping_cost = p_shipping_cost, total = v_total
  where id = p_order_id;

  perform private.write_audit(
    'order', 'update', p_order_id::text, '#' || v_order.order_number,
    jsonb_build_object(
      'shipping_cost', jsonb_build_object('old', v_order.shipping_cost, 'new', p_shipping_cost),
      'total', jsonb_build_object('old', v_order.total, 'new', v_total)
    ),
    p_note
  );

  return v_total;
end;
$$;

-- -----------------------------------------------------------------------------
-- Indicadores del resumen
-- -----------------------------------------------------------------------------
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
    'inventory_units', (select coalesce(sum(stock), 0) from public.products),
    'inventory_value', (select coalesce(sum(stock * price), 0) from public.products),
    'orders_pending', (select count(*) from public.orders where status = 'pending'),
    'orders_to_ship', (
      select count(*) from public.orders where status in ('confirmed', 'preparing')
    ),
    'orders_shipping_unquoted', (
      select count(*) from public.orders
      where status in ('pending', 'confirmed', 'preparing') and shipping_cost is null
    ),
    'orders_expiring_soon', (
      select count(*) from public.orders
      where status = 'pending' and expires_at < now() + interval '12 hours'
    ),
    'orders_last_30d', (
      select count(*) from public.orders
      where status <> 'cancelled' and created_at > now() - interval '30 days'
    ),
    'orders_prev_30d', (
      select count(*) from public.orders
      where status <> 'cancelled'
        and created_at <= now() - interval '30 days'
        and created_at > now() - interval '60 days'
    ),
    'sales_total', (
      select coalesce(sum(total), 0) from public.orders where status <> 'cancelled'
    ),
    'sales_last_30d', (
      select coalesce(sum(total), 0) from public.orders
      where status <> 'cancelled' and created_at > now() - interval '30 days'
    ),
    'sales_prev_30d', (
      select coalesce(sum(total), 0) from public.orders
      where status <> 'cancelled'
        and created_at <= now() - interval '30 days'
        and created_at > now() - interval '60 days'
    ),
    'orders_by_status', (
      select coalesce(jsonb_object_agg(s.status, s.total), '{}'::jsonb)
      from (select status, count(*) as total from public.orders group by status) s
    ),
    'categories_total', (select count(*) from public.categories),
    'shipping_rates_active', (select count(*) from public.shipping_rates where is_active)
  )
  into v_result;

  return v_result;
end;
$$;

-- Ventas por día (hora de Colombia, UTC-5 sin horario de verano). Excluye cancelados.
create or replace function public.admin_sales_series(p_days integer default 30)
returns table (day date, orders integer, revenue bigint)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_days integer := least(greatest(coalesce(p_days, 30), 1), 365);
  v_today date := (now() - interval '5 hours')::date;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return query
  select d.day, count(o.id)::integer, coalesce(sum(o.total), 0)::bigint
  from (
    select (v_today - offs) as day from generate_series(0, v_days - 1) as offs
  ) d
  left join public.orders o
    on o.status <> 'cancelled'
    and (o.created_at - interval '5 hours')::date = d.day
  group by d.day
  order by d.day;
end;
$$;

-- Más vendidos del periodo. Los productos eliminados se agrupan por SKU.
create or replace function public.admin_top_products(p_days integer default 30, p_limit integer default 5)
returns table (product_id uuid, product_name text, sku text, units bigint, revenue bigint)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return query
  select
    (array_agg(oi.product_id))[1],
    (array_agg(oi.product_name order by o.created_at desc))[1],
    (array_agg(oi.sku order by o.created_at desc))[1],
    sum(oi.quantity)::bigint,
    sum(oi.subtotal)::bigint
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.status <> 'cancelled'
    and o.created_at > now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 365))
  group by coalesce(oi.product_id::text, 'sku:' || oi.sku)
  order by 4 desc, 5 desc
  limit least(greatest(coalesce(p_limit, 5), 1), 50);
end;
$$;

-- -----------------------------------------------------------------------------
-- Permisos
-- -----------------------------------------------------------------------------
revoke execute on all functions in schema private from public, anon, authenticated;

revoke execute on function public.delete_product(uuid, text) from public, anon;
revoke execute on function public.duplicate_product(uuid) from public, anon;
revoke execute on function public.set_product_specs(uuid, jsonb) from public, anon;
revoke execute on function public.set_order_shipping(uuid, bigint, text) from public, anon;
revoke execute on function public.admin_dashboard_stats() from public, anon;
revoke execute on function public.admin_sales_series(integer) from public, anon;
revoke execute on function public.admin_top_products(integer, integer) from public, anon;

grant execute on function public.delete_product(uuid, text) to authenticated;
grant execute on function public.duplicate_product(uuid) to authenticated;
grant execute on function public.set_product_specs(uuid, jsonb) to authenticated;
grant execute on function public.set_order_shipping(uuid, bigint, text) to authenticated;
grant execute on function public.admin_dashboard_stats() to authenticated;
grant execute on function public.admin_sales_series(integer) to authenticated;
grant execute on function public.admin_top_products(integer, integer) to authenticated;
