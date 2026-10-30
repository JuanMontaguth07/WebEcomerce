/** Contacto y datos legales públicos de la tienda (tabla store_settings). */
export type StoreSettings = {
  /** Formato internacional sin "+" (ej. 573001234567). */
  whatsappNumber: string | null;
  supportEmail: string | null;
  supportHours: string | null;
  legalName: string | null;
  legalNit: string | null;
  legalDv: string | null;
  legalAddress: string | null;
  legalCity: string | null;
  /** Celular de Nequi (10 dígitos) para pagos por transferencia. */
  nequiNumber: string | null;
  nequiHolder: string | null;
  /** Barra superior de la tienda (ofertas, envíos, novedades). */
  announcementText: string | null;
  /** Ruta interna opcional, p. ej. /productos?oferta=1. */
  announcementHref: string | null;
  announcementEnabled: boolean;
  /** Pesos por dólar para mostrar en COP las ofertas en USD (Arma tu PC). */
  usdCopRate: number | null;
};

export const EMPTY_SETTINGS: StoreSettings = {
  whatsappNumber: null,
  supportEmail: null,
  supportHours: null,
  legalName: null,
  legalNit: null,
  legalDv: null,
  legalAddress: null,
  legalCity: null,
  nequiNumber: null,
  nequiHolder: null,
  announcementText: null,
  announcementHref: null,
  announcementEnabled: false,
  usdCopRate: null,
};

/** Enlace a un chat de WhatsApp con un mensaje inicial. */
export function whatsappLink(number: string, message?: string): string {
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${number}${text}`;
}

/** "300 123 4567" a partir de 573001234567 (celulares colombianos); otros, tal cual con "+". */
export function formatPhone(number: string): string {
  const match = number.match(/^57(3\d{2})(\d{3})(\d{4})$/);
  return match ? `${match[1]} ${match[2]} ${match[3]}` : `+${number}`;
}

/** NIT con dígito de verificación: 1234567890-6. */
export function formatNit(settings: Pick<StoreSettings, "legalNit" | "legalDv">): string | null {
  if (!settings.legalNit) return null;
  return settings.legalDv ? `${settings.legalNit}-${settings.legalDv}` : settings.legalNit;
}
