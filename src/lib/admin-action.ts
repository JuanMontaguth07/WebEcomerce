import "server-only";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { getAdminUser, type AdminUser } from "@/features/auth/session";
import { AppError, failure, logError, success, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

type AdminContext = {
  admin: AdminUser;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

/**
 * Envuelve una Server Action del panel:
 *  1. exige un administrador (rol verificado en la base de datos),
 *  2. valida la entrada con Zod,
 *  3. ejecuta con la sesión del usuario (RLS aplica),
 *  4. devuelve un ActionResult serializable sin filtrar detalles internos.
 * `redirect()` y `notFound()` dentro del handler siguen funcionando.
 */
export function adminAction<Schema extends z.ZodType, Result>(
  schema: Schema,
  handler: (input: z.infer<Schema>, context: AdminContext) => Promise<Result>,
) {
  return async (input: z.input<Schema>): Promise<ActionResult<Result>> => {
    try {
      const admin = await getAdminUser();
      if (!admin) throw new AppError("FORBIDDEN");

      const parsed = schema.safeParse(input);
      if (!parsed.success) {
        throw new AppError("VALIDATION", { details: z.flattenError(parsed.error).fieldErrors });
      }

      const supabase = await createClient();
      return success(await handler(parsed.data, { admin, supabase }));
    } catch (error) {
      unstable_rethrow(error);
      logError("adminAction", error);
      return failure(error);
    }
  };
}
