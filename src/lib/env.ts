/**
 * Variables públicas (se incluyen en el bundle del navegador).
 * Next.js solo reemplaza `process.env.NEXT_PUBLIC_*` cuando se referencian
 * de forma literal, por eso se listan una a una. Se validan sin zod porque este
 * módulo llega al navegador en todas las páginas.
 */
// En Vercel, si no se definió la URL del sitio, se usa el dominio de producción
// del proyecto (variable de sistema que Vercel expone por defecto).
const vercelProductionHost = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;

const raw = {
  NEXT_PUBLIC_SITE_URL:
    process.env.NEXT_PUBLIC_SITE_URL ||
    (vercelProductionHost ? `https://${vercelProductionHost}` : undefined),
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

/** Describe el problema sin revelar la clave (las URLs son públicas y se muestran). */
function urlProblem(name: string, value: string | undefined) {
  if (isHttpUrl(value)) return null;
  return value
    ? `${name} = "${value}" no es una URL completa (debe empezar por https://)`
    : `${name} no está definida`;
}

const problems = [
  urlProblem("NEXT_PUBLIC_SITE_URL", raw.NEXT_PUBLIC_SITE_URL),
  urlProblem("NEXT_PUBLIC_SUPABASE_URL", raw.NEXT_PUBLIC_SUPABASE_URL),
  (raw.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.length ?? 0) < 20 &&
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY falta o está incompleta",
].filter(Boolean);

if (problems.length) {
  throw new Error(
    `Variables de entorno inválidas: ${problems.join("; ")}. En local, copia .env.example a .env.local; en Vercel, revisa Settings → Environment Variables.`,
  );
}

export const publicEnv = raw as { [K in keyof typeof raw]: string };
