import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import type { ShippingQuote, ShippingRate } from "./types";

export const SHIPPING_TAG = "shipping-rates";

/** Tarifa para un lugar; null si no hay ninguna configurada ("por confirmar"). */
export async function getShippingQuote(
  department: string,
  city: string,
): Promise<ShippingQuote | null> {
  "use cache";
  cacheTag(SHIPPING_TAG);
  cacheLife("minutes");

  const { data, error } = await createPublicClient({ retry: true }).rpc("shipping_quote", {
    p_department: department,
    p_city: city,
  });
  if (error) throw new Error(`[getShippingQuote] ${error.message}`);
  const row = data?.[0];
  return row ? { price: Number(row.price), minDays: row.min_days, maxDays: row.max_days } : null;
}

/** Panel: todas las tarifas, ordenadas por departamento y con la general primero. */
export async function listShippingRates(): Promise<ShippingRate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shipping_rates")
    .select("id, department, city, price, min_days, max_days, is_active")
    .order("department")
    .order("city", { nullsFirst: true });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    department: row.department,
    city: row.city,
    price: Number(row.price),
    minDays: row.min_days,
    maxDays: row.max_days,
    isActive: row.is_active,
  }));
}
