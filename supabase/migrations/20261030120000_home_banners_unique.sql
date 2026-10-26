-- =============================================================================
-- Anuncios de la portada y piezas únicas.
--   * home_banners: anuncios propios de la tienda ("Armamos tu PC", "Te
--     asesoramos") que se intercalan entre las secciones de la portada, con
--     imagen subida o una ilustración incluida.
--   * products.unique_note: por qué un producto es una pieza única; los que la
--     tienen salen en "Piezas únicas" de la portada.
--   * Ambos quedan en el historial general.
-- =============================================================================

create table public.home_banners (
  id uuid primary key default gen_random_uuid(),
  eyebrow text check (char_length(eyebrow) <= 40),
  title text not null check (char_length(btrim(title)) between 3 and 70),
  body text check (char_length(body) <= 220),
  cta_label text check (char_length(cta_label) <= 30),
  -- Solo rutas de la tienda: tras la primera barra no puede ir otra barra.
  cta_href text constraint home_banners_cta_href_format
    check (cta_href is null or (cta_href ~ '^/([^/\\\s][^\s]*)?$' and char_length(cta_href) <= 200)),
  image_path text check (image_path ~ '^banners/[0-9a-f-]{36}\.(webp|png|jpg|jpeg|avif)$'),
  -- Dibujo incluido que se usa cuando no hay imagen.
  illustration text not null default 'build'
    check (illustration in ('build', 'support', 'shipping', 'warranty', 'deals', 'upgrade')),
  position integer not null default 0 check (position between 0 and 1000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint home_banners_cta_complete check ((cta_label is null) = (cta_href is null))
);

comment on table public.home_banners is
  'Anuncios propios de la tienda entre las secciones de la portada (orden por position).';

create trigger home_banners_set_updated_at
  before update on public.home_banners
  for each row execute function public.set_updated_at();

alter table public.home_banners enable row level security;

create policy home_banners_select on public.home_banners
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy home_banners_admin_insert on public.home_banners
  for insert to authenticated with check ((select public.is_admin()));
create policy home_banners_admin_update on public.home_banners
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy home_banners_admin_delete on public.home_banners
  for delete to authenticated using ((select public.is_admin()));

revoke truncate, references, trigger on public.home_banners from anon, authenticated;

-- Los dos servicios que la tienda ofrece; se editan o borran desde el panel.
insert into public.home_banners (eyebrow, title, body, cta_label, cta_href, illustration, position) values
  ('Computadores a la medida', 'Armamos tu PC',
   'Elige los componentes o cuéntanos para qué lo necesitas y te lo armamos.',
   'Ver computadores', '/productos', 'build', 10),
  ('Asesoría', 'Te ayudamos a elegir',
   '¿No sabes qué tarjeta gráfica o procesador te conviene? Escríbenos y te recomendamos según tu presupuesto.',
   'Hablar con nosotros', '/soporte', 'support', 20);

-- -----------------------------------------------------------------------------
-- Piezas únicas
-- -----------------------------------------------------------------------------
alter table public.products
  add column unique_note text check (char_length(btrim(unique_note)) between 3 and 200);

comment on column public.products.unique_note is
  'Por qué es una pieza única (NULL = producto normal). Sale en "Piezas únicas" de la portada.';

create index products_unique_idx on public.products (created_at desc)
  where unique_note is not null and is_active;

grant insert (unique_note), update (unique_note) on public.products to authenticated;

-- -----------------------------------------------------------------------------
-- Historial
-- -----------------------------------------------------------------------------
alter table public.audit_log drop constraint audit_log_entity_check;
alter table public.audit_log add constraint audit_log_entity_check check (entity in (
  'product', 'product_image', 'product_specs', 'category', 'spec_definition', 'brand',
  'order', 'inventory', 'shipping_rate', 'store_settings', 'rarity', 'product_flag',
  'home_banner'
));

-- La etiqueta del historial es el título del anuncio.
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
  v_label text := coalesce(v_row ->> 'name', v_row ->> 'title');
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

revoke execute on function private.audit_row_change() from public, anon, authenticated;

create trigger home_banners_audit
  after insert or update or delete on public.home_banners
  for each row execute function private.audit_row_change('home_banner');
