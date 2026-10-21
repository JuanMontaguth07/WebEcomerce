-- =============================================================================
-- Comercio: pedidos, inventario trazable y pagos (preparado para Wompi /
-- Mercado Pago). Toda modificación de stock ocurre dentro de funciones
-- transaccionales que bloquean las filas de producto afectadas.
-- =============================================================================

-- Funciones internas: no se exponen por la API (PostgREST solo publica "public").
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Pedidos
-- -----------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity (start with 1001) unique,
  user_id uuid references public.profiles (id) on delete set null,
  customer_name text not null check (char_length(customer_name) between 3 and 120),
  customer_email text not null check (
    char_length(customer_email) <= 254
    and customer_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  customer_phone text not null check (customer_phone ~ '^\+?[0-9]{7,15}$'),
  customer_document text check (customer_document ~ '^[0-9A-Za-z-]{5,20}$'),
  department text not null check (char_length(department) between 2 and 60),
  city text not null check (char_length(city) between 2 and 80),
  address text not null check (char_length(address) between 5 and 200),
  notes text check (char_length(notes) <= 500),
  subtotal bigint not null check (subtotal >= 0),
  -- NULL = costo de envío por confirmar con el cliente.
  shipping_cost bigint check (shipping_cost >= 0),
  total bigint not null,
  currency char(3) not null default 'COP',
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'unpaid',
  access_token_hash text not null,
  data_consent_at timestamptz not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_total_matches check (total = subtotal + coalesce(shipping_cost, 0))
);

comment on column public.orders.access_token_hash is
  'SHA-256 del token que recibe el cliente para consultar su pedido sin cuenta.';
comment on column public.orders.expires_at is
  'Un pedido pendiente reserva stock hasta esta fecha; luego expire_pending_orders() lo cancela.';

create index orders_status_created_idx on public.orders (status, created_at desc);
create index orders_created_idx on public.orders (created_at desc);
create index orders_email_created_idx on public.orders (customer_email, created_at desc);
create index orders_user_id_idx on public.orders (user_id);
create index orders_pending_expiry_idx on public.orders (expires_at) where status = 'pending';

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- Snapshot inmutable de cada línea al momento de la compra.
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  product_name text not null,
  sku text not null,
  unit_price bigint not null check (unit_price > 0),
  quantity integer not null check (quantity between 1 and 99),
  subtotal bigint not null,
  created_at timestamptz not null default now(),
  constraint order_items_subtotal_matches check (subtotal = unit_price * quantity),
  constraint order_items_order_product_unique unique (order_id, product_id)
);

create index order_items_product_id_idx on public.order_items (product_id);

create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  note text check (char_length(note) <= 500),
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

-- -----------------------------------------------------------------------------
-- Movimientos de inventario (solo inserción)
-- -----------------------------------------------------------------------------
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  movement_type public.inventory_movement_type not null,
  quantity integer not null check (quantity <> 0),
  previous_stock integer not null check (previous_stock >= 0),
  resulting_stock integer not null check (resulting_stock >= 0),
  reason text check (char_length(reason) <= 300),
  order_id uuid references public.orders (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint inventory_movements_arithmetic check (resulting_stock = previous_stock + quantity)
);

create index inventory_movements_product_created_idx
  on public.inventory_movements (product_id, created_at desc);
create index inventory_movements_created_idx on public.inventory_movements (created_at desc);
create index inventory_movements_order_idx on public.inventory_movements (order_id);

-- -----------------------------------------------------------------------------
-- Pagos (sin uso en el MVP; lo llenarán los adaptadores de pasarela)
-- -----------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  provider text not null check (provider in ('wompi', 'mercadopago', 'manual')),
  provider_reference text,
  amount bigint not null check (amount > 0),
  currency char(3) not null default 'COP',
  status public.payment_status not null default 'pending',
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_provider_reference_unique unique (provider, provider_reference)
);

create index payments_order_id_idx on public.payments (order_id);

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Reglas de negocio
-- -----------------------------------------------------------------------------

-- Política de envío: punto único de cambio. NULL = "por confirmar".
create or replace function public.calculate_shipping_cost(
  p_department text,
  p_city text,
  p_subtotal bigint
)
returns bigint
language sql
stable
set search_path = ''
as $$
  select null::bigint;
$$;

create or replace function private.order_transition_allowed(
  p_from public.order_status,
  p_to public.order_status
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_from
    when 'pending' then p_to in ('confirmed', 'cancelled')
    when 'confirmed' then p_to in ('preparing', 'cancelled')
    when 'preparing' then p_to in ('shipped', 'cancelled')
    when 'shipped' then p_to = 'delivered'
    else false
  end;
$$;

-- Devuelve al inventario las unidades de un pedido. Debe llamarse con la fila
-- del pedido ya bloqueada.
create or replace function private.restore_order_stock(
  p_order_id uuid,
  p_reason text,
  p_actor uuid
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform 1
  from public.products p
  where p.id in (select oi.product_id from public.order_items oi where oi.order_id = p_order_id)
  order by p.id
  for update;

  insert into public.inventory_movements (
    product_id, movement_type, quantity, previous_stock, resulting_stock, reason, order_id, created_by
  )
  select p.id, 'cancellation', oi.quantity, p.stock, p.stock + oi.quantity, p_reason, p_order_id, p_actor
  from public.order_items oi
  join public.products p on p.id = oi.product_id
  where oi.order_id = p_order_id;

  update public.products p
  set stock = p.stock + oi.quantity
  from public.order_items oi
  where oi.order_id = p_order_id
    and p.id = oi.product_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- create_order: única vía para crear pedidos.
-- Precios, nombres y stock se leen de la base de datos; del cliente solo se
-- aceptan identificadores de producto y cantidades.
--
-- p_customer: { name, email, phone, document?, department, city, address,
--               notes?, data_consent: true }
-- p_items:    [{ product_id, quantity }]
-- -----------------------------------------------------------------------------
create or replace function public.create_order(p_customer jsonb, p_items jsonb)
returns table (order_id uuid, order_number bigint, access_token text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_items jsonb;
  v_found integer;
  v_shortages jsonb;
  v_subtotal bigint;
  v_shipping bigint;
  v_order_id uuid;
  v_order_number bigint;
  v_token text;
  v_email text := lower(btrim(p_customer ->> 'email'));
  v_actor uuid := (select auth.uid());
begin
  if jsonb_typeof(p_customer) is distinct from 'object' then
    raise exception 'INVALID_CUSTOMER' using errcode = 'P0001';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART' using errcode = 'P0001';
  end if;

  if jsonb_array_length(p_items) > 50 then
    raise exception 'TOO_MANY_ITEMS' using errcode = 'P0001';
  end if;

  if coalesce((p_customer ->> 'data_consent')::boolean, false) is not true then
    raise exception 'CONSENT_REQUIRED' using errcode = 'P0001';
  end if;

  -- Freno básico contra abuso: máximo 5 pedidos por correo cada 15 minutos.
  if (
    select count(*) from public.orders o
    where o.customer_email = v_email and o.created_at > now() - interval '15 minutes'
  ) >= 5 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  -- Agrupa líneas repetidas del mismo producto.
  select jsonb_agg(jsonb_build_object('product_id', r.product_id, 'quantity', r.quantity) order by r.product_id)
  into v_items
  from (
    select (e ->> 'product_id')::uuid as product_id, sum((e ->> 'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) as e
    group by 1
  ) r;

  if exists (
    select 1 from jsonb_to_recordset(v_items) as r(product_id uuid, quantity integer)
    where r.product_id is null or r.quantity is null or r.quantity not between 1 and 99
  ) then
    raise exception 'INVALID_QUANTITY' using errcode = 'P0001';
  end if;

  -- Bloquea los productos en orden estable para evitar interbloqueos entre
  -- pedidos simultáneos.
  perform 1
  from public.products p
  where p.id in (select r.product_id from jsonb_to_recordset(v_items) as r(product_id uuid, quantity integer))
  order by p.id
  for update;

  select count(*)
  into v_found
  from public.products p
  join jsonb_to_recordset(v_items) as r(product_id uuid, quantity integer) on r.product_id = p.id
  where p.is_active;

  if v_found <> jsonb_array_length(v_items) then
    raise exception 'PRODUCT_UNAVAILABLE' using errcode = 'P0001';
  end if;

  select jsonb_agg(jsonb_build_object('product_id', p.id, 'available', p.stock))
  into v_shortages
  from public.products p
  join jsonb_to_recordset(v_items) as r(product_id uuid, quantity integer) on r.product_id = p.id
  where p.stock < r.quantity;

  if v_shortages is not null then
    raise exception 'OUT_OF_STOCK' using errcode = 'P0001', detail = v_shortages::text;
  end if;

  select sum(p.price * r.quantity)
  into v_subtotal
  from public.products p
  join jsonb_to_recordset(v_items) as r(product_id uuid, quantity integer) on r.product_id = p.id;

  v_shipping := public.calculate_shipping_cost(
    p_customer ->> 'department', p_customer ->> 'city', v_subtotal
  );
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.orders (
    user_id, customer_name, customer_email, customer_phone, customer_document,
    department, city, address, notes,
    subtotal, shipping_cost, total, access_token_hash, data_consent_at, expires_at
  )
  values (
    v_actor,
    btrim(p_customer ->> 'name'),
    v_email,
    regexp_replace(coalesce(p_customer ->> 'phone', ''), '[\s().-]', '', 'g'),
    nullif(btrim(p_customer ->> 'document'), ''),
    btrim(p_customer ->> 'department'),
    btrim(p_customer ->> 'city'),
    btrim(p_customer ->> 'address'),
    nullif(btrim(p_customer ->> 'notes'), ''),
    v_subtotal,
    v_shipping,
    v_subtotal + coalesce(v_shipping, 0),
    encode(sha256(convert_to(v_token, 'UTF8')), 'hex'),
    now(),
    now() + interval '48 hours'
  )
  returning id, order_number into v_order_id, v_order_number;

  insert into public.order_items (order_id, product_id, product_name, sku, unit_price, quantity, subtotal)
  select v_order_id, p.id, p.name, p.sku, p.price, r.quantity, p.price * r.quantity
  from public.products p
  join jsonb_to_recordset(v_items) as r(product_id uuid, quantity integer) on r.product_id = p.id;

  insert into public.inventory_movements (
    product_id, movement_type, quantity, previous_stock, resulting_stock, reason, order_id, created_by
  )
  select p.id, 'sale', -r.quantity, p.stock, p.stock - r.quantity,
    format('Pedido #%s', v_order_number), v_order_id, v_actor
  from public.products p
  join jsonb_to_recordset(v_items) as r(product_id uuid, quantity integer) on r.product_id = p.id;

  update public.products p
  set stock = p.stock - r.quantity
  from jsonb_to_recordset(v_items) as r(product_id uuid, quantity integer)
  where p.id = r.product_id;

  insert into public.order_status_history (order_id, from_status, to_status, note, changed_by)
  values (v_order_id, null, 'pending', 'Pedido creado', v_actor);

  return query select v_order_id, v_order_number, v_token;
end;
$$;

-- Consulta de un pedido por su token (página de confirmación sin cuenta).
create or replace function public.get_order_by_token(p_order_id uuid, p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'status', o.status,
    'payment_status', o.payment_status,
    'customer_name', o.customer_name,
    'customer_email', o.customer_email,
    'department', o.department,
    'city', o.city,
    'address', o.address,
    'notes', o.notes,
    'subtotal', o.subtotal,
    'shipping_cost', o.shipping_cost,
    'total', o.total,
    'currency', o.currency,
    'created_at', o.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_id', oi.product_id,
        'product_name', oi.product_name,
        'sku', oi.sku,
        'unit_price', oi.unit_price,
        'quantity', oi.quantity,
        'subtotal', oi.subtotal
      ) order by oi.created_at, oi.product_name)
      from public.order_items oi
      where oi.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.id = p_order_id
    and p_token is not null
    and o.access_token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
$$;

-- -----------------------------------------------------------------------------
-- Operaciones de administración
-- -----------------------------------------------------------------------------

-- Ajuste manual de inventario con trazabilidad. Devuelve el stock resultante.
create or replace function public.adjust_stock(
  p_product_id uuid,
  p_quantity integer,
  p_movement_type public.inventory_movement_type,
  p_reason text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous integer;
  v_resulting integer;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_movement_type not in ('initial', 'restock', 'adjustment', 'return') then
    raise exception 'INVALID_MOVEMENT_TYPE' using errcode = 'P0001';
  end if;

  if p_quantity is null or p_quantity = 0
    or (p_movement_type <> 'adjustment' and p_quantity < 0) then
    raise exception 'INVALID_QUANTITY' using errcode = 'P0001';
  end if;

  if p_movement_type = 'adjustment' and char_length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'REASON_REQUIRED' using errcode = 'P0001';
  end if;

  select stock into v_previous from public.products where id = p_product_id for update;

  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  v_resulting := v_previous + p_quantity;

  if v_resulting < 0 then
    raise exception 'INSUFFICIENT_STOCK' using errcode = 'P0001';
  end if;

  update public.products set stock = v_resulting where id = p_product_id;

  insert into public.inventory_movements (
    product_id, movement_type, quantity, previous_stock, resulting_stock, reason, created_by
  )
  values (
    p_product_id, p_movement_type, p_quantity, v_previous, v_resulting,
    nullif(btrim(p_reason), ''), (select auth.uid())
  );

  return v_resulting;
end;
$$;

-- Cambio de estado de un pedido. Cancelar devuelve el stock reservado.
create or replace function public.update_order_status(
  p_order_id uuid,
  p_status public.order_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.order_status;
  v_number bigint;
  v_actor uuid := (select auth.uid());
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select status, order_number into v_current, v_number
  from public.orders where id = p_order_id for update;

  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  if not private.order_transition_allowed(v_current, p_status) then
    raise exception 'INVALID_TRANSITION' using errcode = 'P0001',
      detail = format('%s -> %s', v_current, p_status);
  end if;

  if p_status = 'cancelled' then
    perform private.restore_order_stock(p_order_id, format('Cancelación pedido #%s', v_number), v_actor);
  end if;

  update public.orders
  set status = p_status,
      expires_at = null
  where id = p_order_id;

  insert into public.order_status_history (order_id, from_status, to_status, note, changed_by)
  values (p_order_id, v_current, p_status, nullif(btrim(p_note), ''), v_actor);
end;
$$;

-- Cancela pedidos pendientes vencidos y libera su stock. Pensada para
-- ejecutarse periódicamente con pg_cron (no expuesta a usuarios).
create or replace function public.expire_pending_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
  v_count integer := 0;
begin
  for v_order in
    select id, order_number from public.orders
    where status = 'pending' and expires_at < now()
    order by expires_at
    for update skip locked
  loop
    perform private.restore_order_stock(v_order.id, format('Vencimiento pedido #%s', v_order.order_number), null);

    update public.orders set status = 'cancelled', expires_at = null where id = v_order.id;

    insert into public.order_status_history (order_id, from_status, to_status, note)
    values (v_order.id, 'pending', 'cancelled', 'Cancelado automáticamente por vencimiento');

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- Permisos de ejecución. Supabase concede EXECUTE a anon y authenticated por
-- defecto, así que se retira explícitamente y se concede solo lo necesario.
revoke execute on function public.create_order(jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.get_order_by_token(uuid, text) from public, anon, authenticated;
revoke execute on function public.adjust_stock(uuid, integer, public.inventory_movement_type, text) from public, anon, authenticated;
revoke execute on function public.update_order_status(uuid, public.order_status, text) from public, anon, authenticated;
revoke execute on function public.expire_pending_orders() from public, anon, authenticated;
revoke execute on function public.calculate_shipping_cost(text, text, bigint) from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;

grant execute on function public.create_order(jsonb, jsonb) to anon, authenticated;
grant execute on function public.get_order_by_token(uuid, text) to anon, authenticated;
grant execute on function public.calculate_shipping_cost(text, text, bigint) to anon, authenticated;
grant execute on function public.adjust_stock(uuid, integer, public.inventory_movement_type, text) to authenticated;
grant execute on function public.update_order_status(uuid, public.order_status, text) to authenticated;
