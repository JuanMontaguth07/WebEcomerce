-- =============================================================================
-- Chat del equipo conectado con la tienda.
--   * admin_messages.product_id: producto compartido en el mensaje (tarjeta con
--     foto, precio y stock). Si el producto se borra, el mensaje queda sin él.
--   * admin_messages.mentions: administradores mencionados con @ (máx. 10).
--   * Un mensaje puede ir sin texto si comparte un producto. Eso se valida al
--     escribirlo (trigger) y no con un check: así borrar el producto (que deja
--     product_id en null) no choca con el mensaje.
--   * Los pedidos se citan escribiendo su número (#1042); no necesitan columna.
-- =============================================================================

alter table public.admin_messages
  add column product_id uuid references public.products (id) on delete set null,
  add column mentions uuid[] not null default '{}' check (cardinality(mentions) <= 10);

comment on column public.admin_messages.product_id is 'Producto compartido en el mensaje.';
comment on column public.admin_messages.mentions is 'Administradores mencionados con @.';

alter table public.admin_messages drop constraint admin_messages_body_check;
alter table public.admin_messages add constraint admin_messages_body_check
  check (char_length(body) <= 2000);

create index admin_messages_product_idx on public.admin_messages (product_id)
  where product_id is not null;

-- Al escribir: texto o producto, y solo se menciona a administradores.
create or replace function private.check_admin_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if btrim(new.body) = '' and new.product_id is null then
    raise exception 'EMPTY_MESSAGE' using errcode = '23514';
  end if;
  new.mentions := coalesce(array(select distinct m from unnest(new.mentions) as m), '{}');
  if exists (
    select 1
    from unnest(new.mentions) as m
    left join public.profiles p on p.id = m
    where p.id is null or p.role <> 'admin'
  ) then
    raise exception 'INVALID_MENTION' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function private.check_admin_message() from public, anon, authenticated;

create trigger admin_messages_check
  before insert on public.admin_messages
  for each row execute function private.check_admin_message();
