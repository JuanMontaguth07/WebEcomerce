-- El enlace del anuncio debe quedarse en la tienda: «//sitio» o «/\sitio» los
-- navegadores los abren como enlaces externos, así que tras la primera barra
-- no puede venir otra barra (normal o invertida).
alter table public.store_settings
  drop constraint store_settings_announcement_href_format,
  add constraint store_settings_announcement_href_format check (
    announcement_href is null
    or (announcement_href ~ '^/([^/\\\s][^\s]*)?$' and char_length(announcement_href) <= 200)
  );
