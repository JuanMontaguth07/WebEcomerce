import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

const RETRY_DELAY_MS = 350;

/**
 * Sin la caché de datos de Next: la única caché es la de 'use cache' (con
 * etiquetas que el panel invalida). Si Next también guardara la respuesta HTTP
 * —sin etiquetas y con su propia vigencia— una edición del panel podría seguir
 * mostrando datos viejos varios minutos.
 */
const fetchNoStore: typeof fetch = (input, init) => fetch(input, { ...init, cache: "no-store" });

/**
 * Reintenta una vez si Supabase responde con error 5xx o falla la red.
 * Solo para lecturas: una escritura reintentada podría duplicarse.
 */
const fetchWithRetry: typeof fetch = async (input, init) => {
  try {
    const response = await fetchNoStore(input, init);
    if (response.status < 500) return response;
  } catch {
    // Error de red: se reintenta abajo.
  }
  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  return fetchNoStore(input, init);
};

/**
 * Cliente anónimo sin cookies para lecturas públicas del catálogo.
 * Al no depender de la petición, sus consultas pueden cachearse con
 * `'use cache'` + `cacheTag` y revalidarse cuando el admin edita datos.
 *
 * `retry: true` solo en lecturas (catálogo, cotización, consulta de pedido).
 */
export function createPublicClient({ retry = false }: { retry?: boolean } = {}) {
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: retry ? fetchWithRetry : fetchNoStore },
    },
  );
}
