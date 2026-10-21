import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Solo se permite volver a estas rutas después de validar el enlace del correo. */
const ALLOWED_NEXT = new Set(["/ingresar/nueva-clave", "/admin"]);

/**
 * Recibe el enlace de los correos de Supabase Auth (restablecer contraseña),
 * canjea el código de un solo uso por una sesión y redirige.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";
  const destination = ALLOWED_NEXT.has(next) ? next : "/admin";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destination, origin));
    console.error("[auth/callback]", error.status, error.code);
  }
  return NextResponse.redirect(new URL("/ingresar?error=enlace-invalido", origin));
}
