-- =============================================================================
-- Chat del equipo: borrar un mensaje propio.
--   * No se elimina la fila (las respuestas la citan): queda «Mensaje eliminado»
--     con el texto, el producto, las menciones y las reacciones borrados.
--   * Solo lo hace su autor, con delete_admin_message(); la tabla sigue sin
--     permiso de UPDATE para los usuarios.
-- =============================================================================

alter table public.admin_messages add column deleted_at timestamptz;

comment on column public.admin_messages.deleted_at is 'Cuándo lo borró su autor (queda «Mensaje eliminado»).';

create or replace function public.delete_admin_message(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.admin_messages
  set deleted_at = now(), body = '', product_id = null, mentions = '{}'
  where id = p_id and author_id = auth.uid() and deleted_at is null;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  delete from public.admin_message_reactions where message_id = p_id;
end;
$$;

revoke execute on function public.delete_admin_message(uuid) from public, anon;
grant execute on function public.delete_admin_message(uuid) to authenticated;
