export const ADMIN_HOME = "/admin";

/**
 * Destino seguro después de iniciar sesión: solo rutas internas del panel.
 * Evita redirecciones abiertas (`//sitio-malicioso.com`, `https://...`, `/\\...`).
 */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string") return ADMIN_HOME;
  const isSafe = /^\/admin(?:\/[A-Za-z0-9\-_/]*)?(?:\?[A-Za-z0-9\-_=&%.]*)?$/.test(value);
  return isSafe && !value.includes("//") ? value : ADMIN_HOME;
}
