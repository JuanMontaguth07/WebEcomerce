import "server-only";
import { createClient } from "@/lib/supabase/server";
import { toOffer } from "./mappers";
import type { ProductOffer } from "./stores";

/** Ofertas de un producto en otras tiendas, en el orden que dejó el admin. */
export async function getProductOffers(productId: string): Promise<ProductOffer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_offers")
    .select("id, store, store_name, url, price, currency, note, checked_at")
    .eq("product_id", productId)
    .order("position");
  if (error) throw error;
  return data.map(toOffer);
}
