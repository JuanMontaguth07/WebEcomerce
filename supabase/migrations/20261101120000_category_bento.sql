-- =============================================================================
-- Categorías en bento de la portada.
--   * categories.image_path (ya existía sin uso): foto opcional de la categoría,
--     subida desde el panel; sin foto se usa la ilustración incluida.
--   * category_product_counts(): productos visibles por categoría principal
--     (suma sus subcategorías). El tamaño de cada celda sale de este conteo.
-- =============================================================================

-- Nada escribía la columna; cualquier valor fuera de la carpeta se descarta.
update public.categories
  set image_path = null
  where image_path !~ '^categories/[0-9a-f-]{36}\.(webp|png|jpg|jpeg|avif)$';

alter table public.categories
  add constraint categories_image_path_format
    check (image_path ~ '^categories/[0-9a-f-]{36}\.(webp|png|jpg|jpeg|avif)$');

comment on column public.categories.image_path is
  'Foto de la categoría en el bucket del catálogo (categories/<uuid>.<ext>), o null.';

-- Security invoker: cuenta solo lo que el visitante puede ver (productos y
-- categorías activos), igual que el catálogo público.
create or replace function public.category_product_counts()
returns table (category_id uuid, product_count integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(c.parent_id, c.id), count(*)::integer
  from public.products p
  join public.categories c on c.id = p.category_id
  where p.is_active
  group by 1;
$$;

revoke execute on function public.category_product_counts() from public;
grant execute on function public.category_product_counts() to anon, authenticated;
