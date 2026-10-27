-- =============================================================================
-- Kova Architect: qué pieza del PC representa cada categoría.
--   * categories.architect_part: procesador, placa, gráfica… Lo fija el admin al
--     aplicar la plantilla de Architect en la categoría. Una subcategoría sin
--     valor propio usa el de su categoría principal.
-- =============================================================================

alter table public.categories
  add column architect_part text
    constraint categories_architect_part_check
    check (architect_part in ('cpu', 'motherboard', 'gpu', 'ram', 'storage', 'psu', 'cooler', 'case'));

comment on column public.categories.architect_part is
  'Pieza que representa en Kova Architect (cpu, motherboard, gpu…), o null si no participa.';
