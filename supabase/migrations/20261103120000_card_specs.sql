-- =============================================================================
-- Especificaciones clave en la tarjeta de producto.
--   * spec_definitions.show_on_card: el admin elige, por categoría, hasta 3
--     especificaciones de la ficha técnica que se muestran en las tarjetas
--     (VRAM, núcleos, capacidad…). Se ordenan por la posición de la ficha.
-- =============================================================================

alter table public.spec_definitions
  add column show_on_card boolean not null default false;

comment on column public.spec_definitions.show_on_card is
  'Se muestra en la tarjeta de producto (máximo 3 por categoría).';

create or replace function public.limit_card_specs()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.show_on_card and (
    select count(*) from public.spec_definitions d
    where d.category_id = new.category_id and d.show_on_card and d.id <> new.id
  ) >= 3 then
    raise exception 'CARD_SPECS_LIMIT' using errcode = 'P0001',
      hint = 'Una categoría muestra como máximo 3 especificaciones en la tarjeta.';
  end if;
  return new;
end;
$$;

revoke execute on function public.limit_card_specs() from public, anon, authenticated;

create trigger spec_definitions_limit_card
  before insert or update of show_on_card, category_id on public.spec_definitions
  for each row execute function public.limit_card_specs();

-- Punto de partida: las 3 primeras de cada ficha. El admin las cambia en la categoría.
select set_config('app.audit_reason', 'Especificaciones iniciales de la tarjeta de producto', true);

update public.spec_definitions d
set show_on_card = true
from (
  select id, row_number() over (partition by category_id order by position, key) as n
  from public.spec_definitions
) ranked
where ranked.id = d.id and ranked.n <= 3;
