"use server";

import { z } from "zod";
import { failure, logError, success, type ActionResult } from "@/lib/errors";
import { MAX_LINES, MAX_QUANTITY } from "./logic";
import { quoteItems } from "./queries";
import type { CartQuote } from "./quote";

const itemsSchema = z
  .array(z.object({ productId: z.uuid(), quantity: z.number().int().min(1).max(MAX_QUANTITY) }))
  .max(MAX_LINES);

/** Acción pública: devuelve precios y disponibilidad actuales del carrito. */
export async function quoteCart(items: unknown): Promise<ActionResult<CartQuote>> {
  try {
    return success(await quoteItems(itemsSchema.parse(items)));
  } catch (error) {
    logError("quoteCart", error);
    return failure(error);
  }
}
