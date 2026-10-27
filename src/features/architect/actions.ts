"use server";

import { z } from "zod";
import { PART_KINDS } from "@/features/compatibility/types";
import { AppError, failure, fieldErrors, logError, success, type ActionResult } from "@/lib/errors";
import { createPublicClient } from "@/lib/supabase/public";
import { SHARE_CODE } from "./saved";

const MAX_PRICE = 200_000_000;

const answersSchema = z
  .object({
    use: z.enum(["gaming", "work", "study", "editing", "all"]),
    budget: z.number().int().min(0).max(MAX_PRICE),
    resolution: z.enum(["1080p", "1440p", "4k"]),
    brand: z.enum(["any", "amd", "intel", "nvidia"]),
    priority: z.enum(["performance", "looks", "balanced"]),
    extras: z.enum(["none", "monitor", "monitor-peripherals"]),
  })
  .nullable();

const payloadSchema = z.object({
  name: z.string().trim().min(1, "Ponle un nombre.").max(80, "Máximo 80 caracteres."),
  mode: z.enum(["guided", "free"]),
  source: z.enum(["catalog", "demo"]),
  budget: z.number().int().min(0).max(MAX_PRICE).nullable(),
  answers: answersSchema,
  parent_code: z.string().regex(SHARE_CODE).nullable(),
  components: z
    .array(
      z.union([
        z.object({ kind: z.enum(PART_KINDS), product_id: z.uuid() }),
        z.object({
          kind: z.enum(PART_KINDS),
          demo_part_id: z.string().regex(/^demo-[a-z0-9-]{1,40}$/),
          name: z.string().min(1).max(200),
          price: z.number().int().min(0).max(MAX_PRICE),
        }),
      ]),
    )
    .min(1, "Elige al menos una pieza.")
    .max(12),
});

/**
 * Acción pública: guarda la configuración (una versión nueva, inmutable) y
 * devuelve el código de su enlace. Los precios de la tienda los pone la base.
 */
export async function saveBuild(payload: unknown): Promise<ActionResult<{ code: string }>> {
  try {
    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError("VALIDATION", { details: fieldErrors(parsed.error) });
    }
    const { data, error } = await createPublicClient().rpc("save_build", {
      p_build: parsed.data,
    });
    if (error) throw error;
    return success({ code: data });
  } catch (error) {
    logError("saveBuild", error);
    return failure(error);
  }
}
