import { z } from "zod";

/**
 * Variables públicas (se incluyen en el bundle del navegador).
 * Next.js solo reemplaza `process.env.NEXT_PUBLIC_*` cuando se referencian
 * de forma literal, por eso se listan una a una.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url({ protocol: /^https?$/ }),
  NEXT_PUBLIC_SUPABASE_URL: z.url({ protocol: /^https?$/ }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});

const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

if (!parsed.success) {
  const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(
    `Variables de entorno inválidas o faltantes: ${missing}. Copia .env.example a .env.local y complétalas.`,
  );
}

export const publicEnv = parsed.data;
