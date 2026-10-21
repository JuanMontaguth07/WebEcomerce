import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Solo las rutas con sesión pasan por el proxy: el catálogo público (checkout
// como invitado) no paga el costo de verificar sesiones.
export const config = {
  matcher: ["/admin/:path*", "/ingresar"],
};
