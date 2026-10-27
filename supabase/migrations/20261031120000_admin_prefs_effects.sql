-- =============================================================================
-- Preferencias del panel por administrador y efectos nuevos de rareza.
--   * profiles.admin_accent / admin_font: color de acento y fuente del panel que
--     cada administrador elige en "Mi cuenta" (solo afectan su propia vista).
--   * rarities.effect admite 'circuit' (luz que recorre el borde como una pista
--     de circuito) y 'surge' (los bordes se encienden con más intensidad).
-- =============================================================================

alter table public.profiles
  add column admin_accent text not null default 'orange'
    check (admin_accent in ('orange', 'red', 'lime', 'blue', 'violet', 'teal')),
  add column admin_font text not null default 'plex'
    check (admin_font in ('plex', 'figtree', 'hanken'));

comment on column public.profiles.admin_accent is 'Color de acento del panel para este usuario.';
comment on column public.profiles.admin_font is 'Fuente del panel para este usuario.';

-- La política profiles_update_own ya limita la edición a la propia fila.
grant update (admin_accent, admin_font) on public.profiles to authenticated;

alter table public.rarities drop constraint rarities_effect_check;
alter table public.rarities add constraint rarities_effect_check
  check (effect in ('none', 'glow', 'pulse', 'shimmer', 'holo', 'circuit', 'surge'));
