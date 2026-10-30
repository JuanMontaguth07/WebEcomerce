-- =============================================================================
-- Comprobantes de pago (Nequi) subidos por el cliente desde su pedido.
--   * payment_receipts guarda la imagen en la base (bytea): es privada, pequeña
--     (el navegador la comprime) y así no hace falta abrir el almacenamiento al
--     público ni usar llaves de servicio. Solo los administradores la leen.
--   * submit_payment_receipt: el cliente la envía con el enlace privado de su
--     pedido (el token). Se revisa el token, el estado del pedido, el tamaño y
--     que el archivo sea de verdad una imagen; un envío nuevo reemplaza al que
--     estaba en revisión. Avisa a los administradores con una alerta.
--   * review_payment_receipt: el admin aprueba (el pedido pasa a confirmado y el
--     pago a pagado) o rechaza con un motivo que el cliente ve.
--   * Mientras hay un comprobante en revisión el pedido no vence solo.
-- =============================================================================

create table public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  image bytea not null check (octet_length(image) between 100 and 2500000),
  mime text not null check (mime in ('image/webp', 'image/jpeg', 'image/png')),
  width integer check (width between 1 and 10000),
  height integer check (height between 1 and 10000),
  note text check (char_length(note) <= 300),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'replaced')),
  review_note text check (char_length(review_note) <= 300),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.payment_receipts is
  'Comprobantes de pago que el cliente sube desde su pedido; solo los lee un administrador.';

create index payment_receipts_order_idx on public.payment_receipts (order_id, created_at desc);
create unique index payment_receipts_one_pending on public.payment_receipts (order_id)
  where status = 'pending';

alter table public.payment_receipts enable row level security;

create policy payment_receipts_admin_select on public.payment_receipts
  for select to authenticated using ((select public.is_admin()));

revoke all on public.payment_receipts from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.payment_receipts from authenticated;

-- Las alertas del panel conocen el tipo nuevo.
alter table public.admin_alerts drop constraint admin_alerts_kind_check;
alter table public.admin_alerts add constraint admin_alerts_kind_check
  check (kind in ('order_new', 'order_status', 'stock_low', 'stock_out', 'payment_receipt'));

-- -----------------------------------------------------------------------------
-- Enviar un comprobante (cliente, con el token de su pedido)
-- -----------------------------------------------------------------------------

create or replace function public.submit_payment_receipt(
  p_order_id uuid,
  p_token text,
  p_image text,
  p_mime text,
  p_width integer default null,
  p_height integer default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
  v_image bytea;
  v_receipt uuid;
begin
  select id, order_number, status, customer_name, total into v_order
  from public.orders
  where id = p_order_id
    and p_token is not null
    and access_token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
  for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_order.status <> 'pending' then
    raise exception 'NOT_PENDING' using errcode = 'P0001';
  end if;

  -- Un tope por pedido: evita llenar la base con envíos repetidos.
  if (select count(*) from public.payment_receipts where order_id = p_order_id) >= 5 then
    raise exception 'TOO_MANY' using errcode = 'P0001';
  end if;

  begin
    v_image := decode(p_image, 'base64');
  exception when others then
    raise exception 'INVALID_IMAGE' using errcode = '22023';
  end;
  if v_image is null or octet_length(v_image) > 2500000 then
    raise exception 'TOO_LARGE' using errcode = '22023';
  end if;
  -- Se mira la firma del archivo, no solo lo que dice ser.
  if not (
    (p_mime = 'image/jpeg' and substring(v_image from 1 for 3) = '\xffd8ff'::bytea)
    or (p_mime = 'image/png' and substring(v_image from 1 for 8) = '\x89504e470d0a1a0a'::bytea)
    or (p_mime = 'image/webp'
        and substring(v_image from 1 for 4) = '\x52494646'::bytea
        and substring(v_image from 9 for 4) = '\x57454250'::bytea)
  ) then
    raise exception 'INVALID_IMAGE' using errcode = '22023';
  end if;

  update public.payment_receipts set status = 'replaced'
  where order_id = p_order_id and status = 'pending';

  insert into public.payment_receipts (order_id, image, mime, width, height, note)
  values (p_order_id, v_image, p_mime, p_width, p_height, nullif(btrim(p_note), ''))
  returning id into v_receipt;

  update public.orders set payment_status = 'pending'
  where id = p_order_id and payment_status in ('unpaid', 'failed');

  insert into public.admin_alerts (kind, title, body, href, actor_id)
  values (
    'payment_receipt',
    format('Comprobante de pago #%s', v_order.order_number),
    format('%s · $ %s · revísalo para confirmar el pedido', v_order.customer_name,
      replace(to_char(v_order.total, 'FM999,999,999,999'), ',', '.')),
    '/admin/pedidos/' || p_order_id,
    null
  );

  return jsonb_build_object('id', v_receipt);
end;
$$;

revoke execute on function public.submit_payment_receipt(uuid, text, text, text, integer, integer, text)
  from public;
grant execute on function public.submit_payment_receipt(uuid, text, text, text, integer, integer, text)
  to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Revisar un comprobante (administrador)
-- -----------------------------------------------------------------------------

create or replace function public.review_payment_receipt(
  p_receipt_id uuid,
  p_approve boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_receipt record;
  v_order_status public.order_status;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select id, order_id, status into v_receipt
  from public.payment_receipts where id = p_receipt_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_receipt.status <> 'pending' then
    raise exception 'ALREADY_REVIEWED' using errcode = 'P0001';
  end if;
  if not p_approve and char_length(btrim(coalesce(p_note, ''))) < 3 then
    raise exception 'REASON_REQUIRED' using errcode = 'P0001';
  end if;

  update public.payment_receipts
  set status = case when p_approve then 'approved' else 'rejected' end,
      review_note = nullif(btrim(p_note), ''),
      reviewed_by = (select auth.uid()),
      reviewed_at = now()
  where id = p_receipt_id;

  select status into v_order_status from public.orders where id = v_receipt.order_id;
  if p_approve then
    update public.orders set payment_status = 'paid' where id = v_receipt.order_id;
    if v_order_status = 'pending' then
      perform public.update_order_status(v_receipt.order_id, 'confirmed', 'Pago verificado con el comprobante');
    end if;
  else
    update public.orders set payment_status = 'unpaid'
    where id = v_receipt.order_id and payment_status = 'pending';
  end if;
end;
$$;

revoke execute on function public.review_payment_receipt(uuid, boolean, text) from public, anon;
grant execute on function public.review_payment_receipt(uuid, boolean, text) to authenticated;

-- -----------------------------------------------------------------------------
-- El cliente ve en qué va su comprobante (sin la imagen)
-- -----------------------------------------------------------------------------

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
    'expires_at', o.expires_at,
    'receipt', (
      select jsonb_build_object(
        'status', r.status,
        'created_at', r.created_at,
        'review_note', r.review_note
      )
      from public.payment_receipts r
      where r.order_id = o.id and r.status <> 'replaced'
      order by r.created_at desc
      limit 1
    ),
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
-- Un pedido con comprobante en revisión no vence solo
-- -----------------------------------------------------------------------------

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
    select o.id, o.order_number from public.orders o
    where o.status = 'pending' and o.expires_at < now()
      and not exists (
        select 1 from public.payment_receipts r
        where r.order_id = o.id and r.status = 'pending'
      )
    order by o.expires_at
    for update of o skip locked
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

revoke execute on function public.expire_pending_orders() from public, anon, authenticated;
