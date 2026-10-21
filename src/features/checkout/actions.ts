"use server";

import { z } from "zod";
import { revalidateCatalog } from "@/features/catalog/revalidate";
import { quoteItems } from "@/features/cart/queries";
import { AppError, failure, logError, success, type ActionResult } from "@/lib/errors";
import { createPublicClient } from "@/lib/supabase/public";
import { checkoutSchema } from "./schemas";

export type PlacedOrder = { orderId: string; orderNumber: number; accessToken: string };

type PlaceOrderResult = ActionResult<PlacedOrder>;

/**
 * Crea el pedido. El navegador solo envía datos de contacto, IDs y cantidades;
 * precios, totales y stock los decide create_order en la base de datos.
 */
export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    const customerErrors = parsed.error.issues
      .filter((issue) => issue.path[0] === "customer")
      .reduce<Record<string, string[]>>((acc, issue) => {
        const key = String(issue.path[1]);
        acc[key] = [...(acc[key] ?? []), issue.message];
        return acc;
      }, {});
    // Un bot que llena el campo trampa recibe un error genérico.
    if (flat.fieldErrors.website) return failure(new AppError("VALIDATION"));
    return failure(new AppError("VALIDATION", { details: customerErrors }));
  }

  const { customer, items } = parsed.data;

  try {
    const { data, error } = await createPublicClient().rpc("create_order", {
      p_customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        document: customer.document ?? "",
        department: customer.department,
        city: customer.city,
        address: customer.address,
        notes: customer.notes ?? "",
        data_consent: customer.dataConsent,
      },
      p_items: items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
    });
    if (error) throw error;

    const order = data[0];
    if (!order) throw new AppError("INTERNAL");

    // El stock cambió: las fichas y listados deben mostrarlo de inmediato.
    const quote = await quoteItems(items);
    revalidateCatalog({
      productSlugs: quote.lines.flatMap((line) => (line.product ? [line.product.slug] : [])),
    });

    return success({
      orderId: order.order_id,
      orderNumber: Number(order.order_number),
      accessToken: order.access_token,
    });
  } catch (error) {
    logError("placeOrder", error);
    return failure(error);
  }
}
