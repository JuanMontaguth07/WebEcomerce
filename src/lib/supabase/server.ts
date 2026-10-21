import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Cliente con la sesión del usuario (cookies). Úsalo en Server Actions,
 * Route Handlers y Server Components que dependan del usuario: RLS aplica
 * con su identidad. No sirve dentro de funciones con `'use cache'`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Llamado desde un Server Component: no puede escribir cookies.
            // proxy.ts se encarga de refrescar la sesión en las rutas protegidas.
          }
        },
      },
    },
  );
}
