-- =============================================================================
-- Seguridad: RLS, privilegios por columna y Storage.
-- Modelo:
--   * anon / authenticated leen solo el catálogo activo.
--   * Solo administradores (profiles.role = 'admin') escriben en el catálogo.
--   * Pedidos e inventario no aceptan escrituras directas: solo las funciones
--     create_order, adjust_stock, update_order_status y expire_pending_orders.
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.spec_definitions enable row level security;
alter table public.product_specs enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.payments enable row level security;

-- TRUNCATE no respeta RLS: se retira a los roles de la API en todas las tablas.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Perfiles
-- -----------------------------------------------------------------------------
revoke insert, update, delete on public.profiles from anon, authenticated;
revoke select on public.profiles from anon;
grant update (full_name) on public.profiles to authenticated;

create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Catálogo: lectura pública de lo activo, escritura solo admin
-- -----------------------------------------------------------------------------
create policy categories_select on public.categories
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));

create policy categories_admin_insert on public.categories
  for insert to authenticated with check ((select public.is_admin()));
create policy categories_admin_update on public.categories
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy categories_admin_delete on public.categories
  for delete to authenticated using ((select public.is_admin()));

create policy brands_select on public.brands
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));

create policy brands_admin_insert on public.brands
  for insert to authenticated with check ((select public.is_admin()));
create policy brands_admin_update on public.brands
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy brands_admin_delete on public.brands
  for delete to authenticated using ((select public.is_admin()));

-- Productos: el stock queda fuera de los privilegios de escritura.
revoke insert, update on public.products from anon, authenticated;
grant insert (
  name, slug, sku, product_type, short_description, description, price, compare_at_price,
  brand_id, category_id, low_stock_threshold, warranty_months, is_active, is_featured,
  seo_title, seo_description
) on public.products to authenticated;
grant update (
  name, slug, sku, product_type, short_description, description, price, compare_at_price,
  brand_id, category_id, low_stock_threshold, warranty_months, is_active, is_featured,
  seo_title, seo_description
) on public.products to authenticated;

create policy products_select on public.products
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));

create policy products_admin_insert on public.products
  for insert to authenticated with check ((select public.is_admin()));
create policy products_admin_update on public.products
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy products_admin_delete on public.products
  for delete to authenticated using ((select public.is_admin()));

create policy product_images_select on public.product_images
  for select to anon, authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.products p where p.id = product_id and p.is_active)
  );

create policy product_images_admin_insert on public.product_images
  for insert to authenticated with check ((select public.is_admin()));
create policy product_images_admin_update on public.product_images
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy product_images_admin_delete on public.product_images
  for delete to authenticated using ((select public.is_admin()));

create policy spec_definitions_select on public.spec_definitions
  for select to anon, authenticated
  using (true);

create policy spec_definitions_admin_insert on public.spec_definitions
  for insert to authenticated with check ((select public.is_admin()));
create policy spec_definitions_admin_update on public.spec_definitions
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy spec_definitions_admin_delete on public.spec_definitions
  for delete to authenticated using ((select public.is_admin()));

create policy product_specs_select on public.product_specs
  for select to anon, authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.products p where p.id = product_id and p.is_active)
  );

create policy product_specs_admin_insert on public.product_specs
  for insert to authenticated with check ((select public.is_admin()));
create policy product_specs_admin_update on public.product_specs
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy product_specs_admin_delete on public.product_specs
  for delete to authenticated using ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- Pedidos, inventario y pagos: solo lectura (admin o dueño del pedido)
-- -----------------------------------------------------------------------------
revoke all on public.orders, public.order_items, public.order_status_history,
  public.inventory_movements, public.payments from anon;
revoke insert, update, delete on public.orders, public.order_items, public.order_status_history,
  public.inventory_movements, public.payments from authenticated;

create policy orders_select_admin_or_owner on public.orders
  for select to authenticated
  using ((select public.is_admin()) or user_id = (select auth.uid()));

create policy order_items_select_admin_or_owner on public.order_items
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
  );

create policy order_status_history_select_admin_or_owner on public.order_status_history
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
  );

create policy inventory_movements_select_admin on public.inventory_movements
  for select to authenticated
  using ((select public.is_admin()));

create policy payments_select_admin on public.payments
  for select to authenticated
  using ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- Storage: bucket público de imágenes del catálogo; solo admin escribe.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalog',
  'catalog',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

create policy catalog_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'catalog' and (select public.is_admin()));

create policy catalog_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'catalog' and (select public.is_admin()))
  with check (bucket_id = 'catalog' and (select public.is_admin()));

create policy catalog_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'catalog' and (select public.is_admin()));
