-- =============================================================================
-- Tasa de cambio para el comparador de Arma tu PC: las ofertas de tiendas en
-- dólares (Amazon, Newegg…) se muestran también en pesos con este valor, que
-- el admin actualiza en Configuración. Sin tasa, solo se muestran en dólares.
-- =============================================================================

alter table public.store_settings
  add column usd_cop_rate integer
    constraint store_settings_usd_rate_range check (usd_cop_rate between 1000 and 20000);

comment on column public.store_settings.usd_cop_rate is
  'Pesos por dólar para mostrar en COP las ofertas en USD de otras tiendas.';
