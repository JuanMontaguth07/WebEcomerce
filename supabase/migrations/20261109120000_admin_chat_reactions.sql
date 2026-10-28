-- =============================================================================
-- Chat del equipo: respuestas citadas y reacciones.
--   * admin_messages.reply_to: el mensaje al que responde (si se borra, la
--     respuesta queda sin cita).
--   * admin_message_reactions: una fila por admin, mensaje y emoji, de una lista
--     corta. Cada admin pone y quita solo las suyas.
--   * La tabla se publica en Realtime. Lleva su propio id: al quitar una
--     reacción, Realtime solo emite la clave (los DELETE no pasan por la RLS),
--     así que no deja ver a quién ni a qué mensaje pertenecía.
-- =============================================================================

alter table public.admin_messages
  add column reply_to uuid references public.admin_messages (id) on delete set null;

comment on column public.admin_messages.reply_to is 'Mensaje al que responde (cita).';

create index admin_messages_reply_to_idx on public.admin_messages (reply_to)
  where reply_to is not null;

create table public.admin_message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.admin_messages (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  emoji text not null check (emoji in ('👍', '❤️', '😂', '👀', '✅', '🔥')),
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

comment on table public.admin_message_reactions is 'Reacciones de los administradores a los mensajes del chat.';

create index admin_message_reactions_user_idx on public.admin_message_reactions (user_id);

alter table public.admin_message_reactions enable row level security;

create policy admin_message_reactions_select on public.admin_message_reactions
  for select to authenticated using ((select public.is_admin()));
create policy admin_message_reactions_insert on public.admin_message_reactions
  for insert to authenticated
  with check ((select public.is_admin()) and user_id = (select auth.uid()));
create policy admin_message_reactions_delete on public.admin_message_reactions
  for delete to authenticated
  using ((select public.is_admin()) and user_id = (select auth.uid()));

revoke all on public.admin_message_reactions from anon;
revoke update, truncate, references, trigger on public.admin_message_reactions from authenticated;

alter publication supabase_realtime add table public.admin_message_reactions;
