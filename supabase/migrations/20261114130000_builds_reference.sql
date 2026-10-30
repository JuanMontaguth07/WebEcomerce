-- =============================================================================
-- Arma tu PC: una configuración puede llevar piezas de referencia (no se venden
-- aquí, pero se comparan y se arman). save_build es igual que antes salvo que
-- acepta productos visibles o de referencia; su precio sigue saliendo de la base.
-- =============================================================================

create or replace function public.save_build(p_build jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_components jsonb := coalesce(p_build -> 'components', '[]'::jsonb);
  v_source text := p_build ->> 'source';
  v_parent uuid;
  v_build uuid;
  v_code text;
  v_item jsonb;
  v_position integer := 0;
  v_product record;
  v_total bigint := 0;
begin
  if jsonb_typeof(v_components) <> 'array'
    or jsonb_array_length(v_components) = 0
    or jsonb_array_length(v_components) > 12 then
    raise exception 'VALIDATION' using errcode = 'P0001';
  end if;

  -- Freno básico contra abuso: como mucho 60 guardados cada 10 minutos en toda la tienda.
  if (select count(*) from public.builds b where b.created_at > now() - interval '10 minutes') >= 60 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  if p_build ? 'parent_code' and p_build ->> 'parent_code' is not null then
    select b.id into v_parent from public.builds b where b.share_code = p_build ->> 'parent_code';
  end if;

  -- 12 caracteres alfanuméricos al azar (62^12 combinaciones): imposibles de adivinar.
  loop
    v_code := array_to_string(array(
      select substr(
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        1 + (get_byte(extensions.gen_random_bytes(1), 0) % 62), 1)
      from generate_series(1, 12)
    ), '');
    exit when not exists (select 1 from public.builds b where b.share_code = v_code);
  end loop;

  insert into public.builds (share_code, name, mode, source, budget, total, answers, parent_id)
  values (
    v_code,
    btrim(coalesce(p_build ->> 'name', '')),
    p_build ->> 'mode',
    v_source,
    nullif(p_build ->> 'budget', '')::bigint,
    0,
    case when jsonb_typeof(p_build -> 'answers') = 'object' then p_build -> 'answers' end,
    v_parent
  )
  returning id into v_build;

  for v_item in select * from jsonb_array_elements(v_components) loop
    if v_source = 'catalog' then
      select p.id, p.name, p.sku, p.price into v_product
      from public.products p
      where p.id = (v_item ->> 'product_id')::uuid and (p.is_active or p.is_reference);
      if not found then
        raise exception 'PRODUCT_UNAVAILABLE' using errcode = 'P0001';
      end if;
      insert into public.build_components (build_id, position, kind, product_id, name, sku, price)
      values (v_build, v_position, v_item ->> 'kind', v_product.id, v_product.name, v_product.sku, v_product.price);
      v_total := v_total + v_product.price;
    else
      -- Las piezas demo viven en el código: se guardan tal cual, con precio de ejemplo.
      insert into public.build_components (build_id, position, kind, demo_part_id, name, price)
      values (
        v_build, v_position, v_item ->> 'kind', v_item ->> 'demo_part_id',
        left(v_item ->> 'name', 200), (v_item ->> 'price')::bigint
      );
      v_total := v_total + (v_item ->> 'price')::bigint;
    end if;
    v_position := v_position + 1;
  end loop;

  update public.builds set total = v_total where id = v_build;
  return v_code;
end;
$$;
