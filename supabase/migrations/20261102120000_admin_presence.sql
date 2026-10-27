-- =============================================================================
-- Estado «en línea» de los administradores en el panel.
--   * En vivo: Supabase Realtime Presence en el canal privado `admin-presence`.
--     Las políticas sobre realtime.messages dejan escuchar y anunciarse solo a
--     los administradores (ni visitantes ni clientes ven quién está conectado).
--   * admin_last_seen: última vez que cada admin tuvo el panel abierto, para
--     mostrar «Visto hace…» cuando no está. Tabla aparte para no tocar el
--     updated_at del perfil en cada pulso.
-- =============================================================================

create table public.admin_last_seen (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  seen_at timestamptz not null default now()
);

comment on table public.admin_last_seen is
  'Última vez que cada administrador tuvo el panel abierto (pulso cada pocos minutos).';

alter table public.admin_last_seen enable row level security;

create policy admin_last_seen_select on public.admin_last_seen
  for select to authenticated using ((select public.is_admin()));

-- Solo se escribe con touch_admin_seen(): nadie fija una hora a mano.
revoke insert, update, delete, truncate, references, trigger on public.admin_last_seen
  from anon, authenticated;
revoke select on public.admin_last_seen from anon;

create or replace function public.touch_admin_seen()
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_last_seen (user_id, seen_at)
  select p.id, now()
  from public.profiles p
  where p.id = (select auth.uid()) and p.role = 'admin'
  on conflict (user_id) do update set seen_at = excluded.seen_at;
$$;

revoke execute on function public.touch_admin_seen() from public, anon;
grant execute on function public.touch_admin_seen() to authenticated;

-- Realtime Authorization: el canal privado de presencia es solo para admins.
create policy admin_presence_listen on realtime.messages
  for select to authenticated
  using (
    realtime.topic() = 'admin-presence'
    and realtime.messages.extension = 'presence'
    and (select public.is_admin())
  );

create policy admin_presence_track on realtime.messages
  for insert to authenticated
  with check (
    realtime.topic() = 'admin-presence'
    and realtime.messages.extension = 'presence'
    and (select public.is_admin())
  );
