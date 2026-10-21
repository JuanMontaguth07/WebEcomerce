import { AppError } from "@/lib/errors";

export const ADMIN_PAGE_SIZE = 25;

/** Limpia texto de búsqueda para filtros de PostgREST (`or`, `ilike`). */
export function sanitizeSearch(value: string | undefined): string | undefined {
  const cleaned = value
    ?.replace(/[%_,()*\\:"']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return cleaned || undefined;
}

type DbError = { code?: string; message?: string };

/**
 * Traduce violaciones de unicidad (23505) y de clave foránea (23503) a
 * errores claros. `uniqueFields` asocia el nombre de la restricción con el
 * campo del formulario y su mensaje.
 */
export function translateDbError(
  error: DbError,
  {
    uniqueFields = {},
    inUse,
  }: { uniqueFields?: Record<string, { field: string; message: string }>; inUse?: string } = {},
): never {
  if (error.code === "23505") {
    const match = Object.entries(uniqueFields).find(([constraint]) =>
      error.message?.includes(constraint),
    );
    if (match) {
      const [, { field, message }] = match;
      throw new AppError("VALIDATION", { details: { [field]: [message] } });
    }
    throw new AppError("CONFLICT");
  }
  if (error.code === "23503" && inUse) {
    throw new AppError("CONFLICT", { message: inUse });
  }
  throw error;
}
