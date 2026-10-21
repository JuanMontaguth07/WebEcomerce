import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Cliente anónimo sin cookies para lecturas públicas del catálogo.
 * Al no depender de la petición, sus consultas pueden cachearse con
 * `'use cache'` + `cacheTag` y revalidarse cuando el admin edita datos.
 */
export function createPublicClient() {
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );
}
