"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { translateDbError } from "@/features/admin/shared";
import { adminAction } from "@/lib/admin-action";
import { failure, logError, success, type ActionResult } from "@/lib/errors";
import { getShippingQuote, SHIPPING_TAG } from "./queries";
import { shippingPlaceSchema, shippingRateSchema } from "./schemas";
import type { ShippingQuote } from "./types";

/** Acción pública del checkout: costo de envío al lugar elegido (null = por confirmar). */
export async function quoteShipping(place: unknown): Promise<ActionResult<ShippingQuote | null>> {
  try {
    const { department, city } = shippingPlaceSchema.parse(place);
    return success(await getShippingQuote(department, city));
  } catch (error) {
    logError("quoteShipping", error);
    return failure(error);
  }
}

const RATE_UNIQUE = {
  shipping_rates_place_key: {
    field: "city",
    message: "Ya hay una tarifa para este lugar. Edítala en la lista.",
  },
};

export const saveShippingRate = adminAction(shippingRateSchema, async (values, { supabase }) => {
  const row = {
    department: values.department,
    city: values.city,
    price: values.price,
    min_days: values.minDays,
    max_days: values.maxDays,
    is_active: values.isActive,
  };
  const { error } = values.id
    ? await supabase.from("shipping_rates").update(row).eq("id", values.id)
    : await supabase.from("shipping_rates").insert(row);
  if (error) translateDbError(error, { uniqueFields: RATE_UNIQUE });
  updateTag(SHIPPING_TAG);
  return { saved: true };
});

export const deleteShippingRate = adminAction(
  z.object({ id: z.uuid() }),
  async ({ id }, { supabase }) => {
    const { error } = await supabase.from("shipping_rates").delete().eq("id", id);
    if (error) throw error;
    updateTag(SHIPPING_TAG);
    return { id };
  },
);
