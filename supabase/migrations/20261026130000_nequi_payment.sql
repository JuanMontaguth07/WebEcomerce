-- =============================================================================
-- Pago por transferencia a Nequi (manual)
--   * store_settings: número de Nequi y titular, que la página del pedido muestra
--     al cliente con el valor a pagar.
--   * get_order_by_token: incluye expires_at para indicar hasta cuándo se
--     mantiene la reserva (después expire_pending_orders cancela el pedido).
-- =============================================================================

alter table public.store_settings
  add column nequi_number text constraint store_settings_nequi_format
    check (nequi_number is null or nequi_number ~ '^3[0-9]{9}$'),
  add column nequi_holder text check (char_length(nequi_holder) <= 120);

comment on column public.store_settings.nequi_number is
  'Celular de Nequi (10 dígitos) para recibir pagos por transferencia.';

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
