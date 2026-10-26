import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { EMPTY_SETTINGS, type StoreSettings } from "./types";

export const STORE_SETTINGS_TAG = "store-settings";

async function fetchStoreSettings(): Promise<StoreSettings> {
  "use cache";
  cacheTag(STORE_SETTINGS_TAG);
  cacheLife("hours");

  const { data, error } = await createPublicClient({ retry: true })
    .from("store_settings")
    .select(COLUMNS)
    .maybeSingle();
  // Lanzar evita que un fallo pasajero quede guardado en la caché.
  if (error) throw new Error(`[getStoreSettings] ${error.message}`);
  return toSettings(data);
}

const COLUMNS =
  "whatsapp_number, support_email, support_hours, legal_name, legal_nit, legal_dv, legal_address, legal_city, nequi_number, nequi_holder, announcement_text, announcement_href, announcement_enabled";

type SettingsRow = {
  whatsapp_number: string | null;
  support_email: string | null;
  support_hours: string | null;
  legal_name: string | null;
  legal_nit: string | null;
  legal_dv: string | null;
  legal_address: string | null;
  legal_city: string | null;
  nequi_number: string | null;
  nequi_holder: string | null;
  announcement_text: string | null;
  announcement_href: string | null;
  announcement_enabled: boolean;
};

function toSettings(data: SettingsRow | null): StoreSettings {
  if (!data) return EMPTY_SETTINGS;
  return {
    whatsappNumber: data.whatsapp_number,
    supportEmail: data.support_email,
    supportHours: data.support_hours,
    legalName: data.legal_name,
    legalNit: data.legal_nit,
    legalDv: data.legal_dv,
    legalAddress: data.legal_address,
    legalCity: data.legal_city,
    nequiNumber: data.nequi_number,
    nequiHolder: data.nequi_holder,
    announcementText: data.announcement_text,
    announcementHref: data.announcement_href,
    announcementEnabled: data.announcement_enabled,
  };
}

/**
 * Panel: lectura directa y sin caché. Si falla, lanza (el formulario no debe
 * mostrarse vacío y sobrescribir los datos guardados al enviarlo).
 */
export async function getStoreSettingsForAdmin(): Promise<StoreSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("store_settings").select(COLUMNS).maybeSingle();
  if (error) throw error;
  return toSettings(data);
}

/** Configuración pública de la tienda. Si la consulta falla, la página sigue sin esos datos. */
export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    return await fetchStoreSettings();
  } catch (error) {
    console.error(error);
    return EMPTY_SETTINGS;
  }
}
