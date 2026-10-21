-- =============================================================================
-- Storage: los administradores necesitan SELECT sobre storage.objects para que
-- Storage pueda borrar archivos (localiza el objeto antes de eliminarlo). Sin
-- esta política, remove() no fallaba pero dejaba archivos huérfanos.
-- El público sigue leyendo las imágenes por su URL pública (bucket público),
-- que no depende de esta política.
-- =============================================================================

create policy catalog_admin_select on storage.objects
  for select to authenticated
  using (bucket_id = 'catalog' and (select public.is_admin()));
