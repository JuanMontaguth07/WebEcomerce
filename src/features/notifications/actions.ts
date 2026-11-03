"use server";

import { after } from "next/server";
import { z } from "zod";
import { notifyReceiptUploaded } from "./notify";

/**
 * El navegador avisa que subió un comprobante (la subida va directo a la base).
 * Se revisa con el token del pedido que exista un comprobante en revisión antes
 * de escribirles a los admins; si no, no pasa nada.
 */
export async function receiptUploaded(input: unknown): Promise<void> {
  const parsed = z
    .object({ orderId: z.uuid(), token: z.string().regex(/^[0-9a-f]{64}$/) })
    .safeParse(input);
  if (!parsed.success) return;
  const { orderId, token } = parsed.data;
  after(() => notifyReceiptUploaded(orderId, token));
}
