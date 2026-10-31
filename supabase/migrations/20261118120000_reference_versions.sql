-- =============================================================================
-- «Disponible aquí» en las piezas de referencia: un producto de la tienda puede
-- ser una versión de una pieza de referencia (p. ej. la «ASUS Dual RTX 5060 Ti»
-- que se vende aquí es una versión de la «NVIDIA GeForce RTX 5060 Ti» del
-- catálogo de referencia). En Arma tu PC la pieza de referencia muestra que se
-- consigue aquí, con su precio y stock, y el carrito agrega esa versión.
-- =============================================================================

alter table public.products
  add column reference_id uuid references public.products (id) on delete set null,
  add constraint products_reference_version check (
    reference_id is null or (reference_id <> id and not is_reference)
  );

comment on column public.products.reference_id is
  'Pieza de referencia de la que este producto es una versión (para «Disponible aquí»).';

create index products_reference_id_idx on public.products (reference_id) where reference_id is not null;

grant insert (reference_id), update (reference_id) on public.products to authenticated;

-- Solo se puede apuntar a una pieza de referencia; y si una deja de serlo, sus
-- versiones se sueltan.
create or replace function private.check_reference_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.reference_id is not null and not exists (
    select 1 from public.products p where p.id = new.reference_id and p.is_reference
  ) then
    raise exception 'REFERENCE_NOT_FOUND' using errcode = 'P0001',
      detail = 'reference_id debe apuntar a una pieza «Solo referencia».';
  end if;
  return new;
end;
$$;

create trigger products_check_reference_version
  before insert or update of reference_id on public.products
  for each row execute function private.check_reference_version();

create or replace function private.release_reference_versions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.products set reference_id = null where reference_id = new.id;
  return new;
end;
$$;

create trigger products_release_reference_versions
  after update of is_reference on public.products
  for each row when (old.is_reference and not new.is_reference)
  execute function private.release_reference_versions();
