/**
 * Variables públicas (se incluyen en el bundle del navegador).
 * Next.js solo reemplaza `process.env.NEXT_PUBLIC_*` cuando se referencian
 * de forma literal, por eso se listan una a una. Se validan sin zod porque este
 * módulo llega al navegador en todas las páginas.
 */
const raw = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};

function isHttpUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

const invalid = [
  !isHttpUrl(raw.NEXT_PUBLIC_SITE_URL) && "NEXT_PUBLIC_SITE_URL",
  !isHttpUrl(raw.NEXT_PUBLIC_SUPABASE_URL) && "NEXT_PUBLIC_SUPABASE_URL",
  (raw.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.length ?? 0) < 20 &&
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
].filter(Boolean);

if (invalid.length) {
  throw new Error(
    `Variables de entorno inválidas o faltantes: ${invalid.join(", ")}. Copia .env.example a .env.local y complétalas.`,
  );
}

export const publicEnv = raw as { [K in keyof typeof raw]: string };
