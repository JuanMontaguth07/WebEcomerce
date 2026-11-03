-- =============================================================================
-- Novedades: correos de quienes quieren recibir noticias de la tienda, con su
-- autorización (Ley 1581 de 2012).
--   * subscribe_newsletter: cualquiera se suscribe con su correo y marcando la
--     autorización; se guarda cuándo, desde dónde y qué texto aceptó. Si ya
--     estaba, se reactiva. La respuesta es siempre la misma: no deja averiguar
--     qué correos están suscritos.
--   * unsubscribe_newsletter: darse de baja con el correo, en cualquier momento.
--   * Solo los administradores ven la lista (para exportarla y escribir).
-- =============================================================================

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique
    check (char_length(email) between 6 and 254 and email = lower(email)
      and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  status text not null default 'active' check (status in ('active', 'unsubscribed')),
  -- De dónde se suscribió (arma-tu-pc, pie de página…) y la versión del texto aceptado.
  source text not null default 'web' check (source ~ '^[a-z0-9-]{2,30}$'),
  consent_version text not null check (char_length(consent_version) between 1 and 20),
  consented_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.newsletter_subscribers is
  'Suscritos a las novedades, con fecha y versión de la autorización de datos.';

create index newsletter_subscribers_status_idx
  on public.newsletter_subscribers (status, created_at desc);

create trigger newsletter_subscribers_set_updated_at
  before update on public.newsletter_subscribers
  for each row execute function public.set_updated_at();

alter table public.newsletter_subscribers enable row level security;

create policy newsletter_subscribers_admin_select on public.newsletter_subscribers
  for select to authenticated using ((select public.is_admin()));
create policy newsletter_subscribers_admin_delete on public.newsletter_subscribers
  for delete to authenticated using ((select public.is_admin()));

revoke all on public.newsletter_subscribers from anon;
revoke insert, update, truncate, references, trigger
  on public.newsletter_subscribers from authenticated;

create or replace function public.subscribe_newsletter(
  p_email text,
  p_consent boolean,
  p_source text default 'web',
  p_consent_version text default 'v1'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_source text := coalesce(nullif(btrim(p_source), ''), 'web');
begin
  if p_consent is not true then
    raise exception 'CONSENT_REQUIRED' using errcode = 'P0001';
  end if;
  if char_length(v_email) not between 6 and 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'INVALID_EMAIL' using errcode = 'P0001';
  end if;
  if v_source !~ '^[a-z0-9-]{2,30}$' then
    v_source := 'web';
  end if;
  -- Freno básico contra abuso: como mucho 60 suscripciones cada 10 minutos en toda la tienda.
  if (
    select count(*) from public.newsletter_subscribers
    where updated_at > now() - interval '10 minutes'
  ) >= 60 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  insert into public.newsletter_subscribers (email, source, consent_version)
  values (v_email, v_source, left(coalesce(p_consent_version, 'v1'), 20))
  on conflict (email) do update
    set status = 'active',
        source = excluded.source,
        consent_version = excluded.consent_version,
        consented_at = now(),
        unsubscribed_at = null
    where public.newsletter_subscribers.status = 'unsubscribed';
end;
$$;

revoke execute on function public.subscribe_newsletter(text, boolean, text, text) from public;
grant execute on function public.subscribe_newsletter(text, boolean, text, text) to anon, authenticated;

create or replace function public.unsubscribe_newsletter(p_email text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.newsletter_subscribers
  set status = 'unsubscribed', unsubscribed_at = now()
  where email = lower(btrim(coalesce(p_email, ''))) and status = 'active';
$$;

revoke execute on function public.unsubscribe_newsletter(text) from public;
grant execute on function public.unsubscribe_newsletter(text) to anon, authenticated;
