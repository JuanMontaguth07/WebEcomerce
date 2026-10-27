-- =============================================================================
-- Logos de marca para la franja «Compra por marca» de la portada.
--   * brands.logo_path (ya existía sin uso): logo subido desde el panel, en la
--     carpeta brands/ del bucket del catálogo. Los logos de terceros no se
--     incluyen en el proyecto: los sube el admin. Sin logo se muestra el nombre.
-- =============================================================================

-- Nada escribía la columna; cualquier valor fuera de la carpeta se descarta.
update public.brands
  set logo_path = null
  where logo_path !~ '^brands/[0-9a-f-]{36}\.(webp|png|jpg|jpeg|avif)$';

alter table public.brands
  add constraint brands_logo_path_format
    check (logo_path ~ '^brands/[0-9a-f-]{36}\.(webp|png|jpg|jpeg|avif)$');
