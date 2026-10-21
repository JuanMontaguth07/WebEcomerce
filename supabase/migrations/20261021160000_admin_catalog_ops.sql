-- =============================================================================
-- Operaciones del panel sobre el catálogo que requieren una sola transacción.
-- SECURITY INVOKER: RLS exige administrador en cada fila modificada.
-- =============================================================================

-- Reordena las imágenes de un producto según el arreglo recibido (posición = índice).
-- La restricción unique(product_id, position) es diferible, así que el
-- intercambio de posiciones se valida al final de la sentencia.
create or replace function public.reorder_product_images(p_product_id uuid, p_image_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if (
    select count(*) from public.product_images where product_id = p_product_id
  ) <> coalesce(cardinality(p_image_ids), 0)
  or exists (
    select 1 from unnest(p_image_ids) as id
    where id not in (select pi.id from public.product_images pi where pi.product_id = p_product_id)
  ) then
    raise exception 'VALIDATION' using errcode = 'P0001',
      detail = 'La lista debe contener exactamente las imágenes del producto.';
  end if;

  update public.product_images pi
  set position = array_position(p_image_ids, pi.id) - 1
  where pi.product_id = p_product_id;
end;
$$;

-- Reemplaza todas las especificaciones de un producto.
-- p_specs: [{ "spec_id": uuid, "value": texto | número | booleano }]
-- Los valores vacíos se omiten. El trigger validate_product_spec comprueba
-- categoría y tipo de cada valor.
create or replace function public.set_product_specs(p_product_id uuid, p_specs jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if jsonb_typeof(p_specs) is distinct from 'array' then
    raise exception 'VALIDATION' using errcode = 'P0001';
  end if;

  delete from public.product_specs where product_id = p_product_id;

  insert into public.product_specs (product_id, spec_id, value_text, value_number, value_boolean)
  select
    p_product_id,
    sd.id,
    case when sd.data_type = 'text' then btrim(e ->> 'value') end,
    case when sd.data_type = 'number' then (e ->> 'value')::numeric end,
    case when sd.data_type = 'boolean' then (e ->> 'value')::boolean end
  from jsonb_array_elements(p_specs) as e
  join public.spec_definitions sd on sd.id = (e ->> 'spec_id')::uuid
  where nullif(btrim(e ->> 'value'), '') is not null;
end;
$$;

revoke execute on function public.reorder_product_images(uuid, uuid[]) from public, anon;
revoke execute on function public.set_product_specs(uuid, jsonb) from public, anon;
grant execute on function public.reorder_product_images(uuid, uuid[]) to authenticated;
grant execute on function public.set_product_specs(uuid, jsonb) to authenticated;
