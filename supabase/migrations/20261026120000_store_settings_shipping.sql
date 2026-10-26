-- =============================================================================
-- Configuración de la tienda y tarifas de envío
--   * store_settings: una sola fila con contacto (WhatsApp, correo, horario) y
--     datos legales del vendedor (Ley 1480: nombre, NIT, dirección). Es
--     información pública; solo el admin la edita desde el panel.
--   * shipping_rates: tarifa por departamento, con excepciones por ciudad.
--   * calculate_shipping_cost / shipping_quote: la tarifa de la ciudad tiene
--     prioridad sobre la del departamento. Sin tarifa → NULL ("por confirmar").
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Configuración (fila única)
-- -----------------------------------------------------------------------------
create table public.store_settings (
  id boolean primary key default true constraint store_settings_single_row check (id),
  -- Número internacional sin "+" ni espacios (Colombia: 57 + 10 dígitos).
  whatsapp_number text constraint store_settings_whatsapp_format
    check (whatsapp_number is null or whatsapp_number ~ '^[1-9][0-9]{7,14}$'),
  support_email text constraint store_settings_email_format
    check (support_email is null or support_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  support_hours text check (char_length(support_hours) <= 200),
  legal_name text check (char_length(legal_name) <= 200),
  legal_nit text constraint store_settings_nit_format
    check (legal_nit is null or legal_nit ~ '^[0-9]{5,15}$'),
  legal_dv text constraint store_settings_dv_format
    check (legal_dv is null or legal_dv ~ '^[0-9]$'),
  legal_address text check (char_length(legal_address) <= 200),
  legal_city text check (char_length(legal_city) <= 100),
  updated_at timestamptz not null default now()
);

comment on table public.store_settings is
  'Contacto y datos legales públicos de la tienda (una sola fila, editable por el admin).';

insert into public.store_settings (id) values (true);

create trigger store_settings_set_updated_at
  before update on public.store_settings
  for each row execute function public.set_updated_at();

alter table public.store_settings enable row level security;

create policy store_settings_select on public.store_settings
  for select to anon, authenticated using (true);
create policy store_settings_admin_update on public.store_settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- La fila es única: nadie inserta ni borra (ni siquiera el admin).
revoke insert, delete, truncate on public.store_settings from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Tarifas de envío
-- -----------------------------------------------------------------------------
-- Clave de comparación de ciudades: sin tildes, minúsculas y espacios simples.
create or replace function public.normalize_place(value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(public.immutable_unaccent(btrim(regexp_replace(coalesce(value, ''), '\s+', ' ', 'g'))));
$$;

create table public.shipping_rates (
  id uuid primary key default gen_random_uuid(),
  department text not null check (char_length(btrim(department)) between 2 and 60),
  -- NULL = tarifa general del departamento.
  city text check (city is null or char_length(btrim(city)) between 2 and 80),
  city_key text generated always as (public.normalize_place(city)) stored,
  price bigint not null check (price >= 0 and price <= 100000000),
  min_days smallint check (min_days between 0 and 60),
  max_days smallint check (max_days between 0 and 60),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shipping_rates_days_order check (min_days is null or max_days is null or min_days <= max_days)
);

comment on table public.shipping_rates is
  'Tarifas de envío: una general por departamento (city NULL) y excepciones por ciudad.';

create unique index shipping_rates_place_key on public.shipping_rates (department, city_key);

create trigger shipping_rates_set_updated_at
  before update on public.shipping_rates
  for each row execute function public.set_updated_at();

alter table public.shipping_rates enable row level security;

-- Las tarifas activas son públicas (el checkout las muestra antes de confirmar).
create policy shipping_rates_select on public.shipping_rates
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy shipping_rates_admin_insert on public.shipping_rates
  for insert to authenticated with check ((select public.is_admin()));
create policy shipping_rates_admin_update on public.shipping_rates
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy shipping_rates_admin_delete on public.shipping_rates
  for delete to authenticated using ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- Cotización de envío
-- -----------------------------------------------------------------------------
create or replace function public.shipping_quote(p_department text, p_city text)
returns table (price bigint, min_days smallint, max_days smallint)
language sql
stable
security invoker
set search_path = ''
as $$
  select r.price, r.min_days, r.max_days
  from public.shipping_rates r
  where r.is_active
    and r.department = btrim(p_department)
    and (r.city_key = public.normalize_place(p_city) or r.city is null)
  order by (r.city is null)  -- la ciudad específica gana
  limit 1;
$$;

-- Se conserva la firma que usa create_order. p_subtotal queda para reglas futuras
-- (p. ej. envío gratis desde un monto).
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
  select (select q.price from public.shipping_quote(p_department, p_city) q);
$$;

revoke execute on function public.shipping_quote(text, text) from public;
grant execute on function public.shipping_quote(text, text) to anon, authenticated;
revoke execute on function public.normalize_place(text) from public;
grant execute on function public.normalize_place(text) to anon, authenticated;
