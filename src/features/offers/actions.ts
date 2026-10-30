"use server";

import { z } from "zod";
import { revalidateCatalog } from "@/features/catalog/revalidate";
import { adminAction } from "@/lib/admin-action";
import { OFFER_STORE_KEYS } from "./stores";

const offerSchema = z
  .object({
    store: z.enum(OFFER_STORE_KEYS as [string, ...string[]]),
    storeName: z.string().trim().max(60).optional(),
    url: z
      .string()
      .trim()
      .max(2000)
      .regex(/^https:\/\/\S+$/, "Pega el enlace completo, empezando por https://"),
    price: z
      .union([z.literal(""), z.coerce.number().int("Usa un número entero.").positive()])
      .transform((value) => (value === "" ? null : value)),
    currency: z.enum(["COP", "USD"]),
    note: z.string().trim().max(120).optional(),
    checkedAt: z.iso.date(),
  })
  .superRefine((value, ctx) => {
    if (value.store === "other" && (value.storeName ?? "").length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["storeName"],
        message: "Escribe el nombre de la tienda.",
      });
    }
  });

/** Reemplaza las ofertas de un producto por las del editor (en ese orden). */
export const saveProductOffers = adminAction(
  z.object({ productId: z.uuid(), offers: z.array(offerSchema).max(20) }),
  async ({ productId, offers }, { supabase }) => {
    const { error: deleteError } = await supabase
      .from("product_offers")
      .delete()
      .eq("product_id", productId);
    if (deleteError) throw deleteError;
    if (offers.length) {
      const { error } = await supabase.from("product_offers").insert(
        offers.map((offer, position) => ({
          product_id: productId,
          store: offer.store,
          store_name: offer.store === "other" ? offer.storeName : null,
          url: offer.url,
          price: offer.price,
          currency: offer.currency,
          note: offer.note || null,
          checked_at: offer.checkedAt,
          position,
        })),
      );
      if (error) throw error;
    }
    // Arma tu PC muestra las ofertas: se refresca su caché del catálogo.
    revalidateCatalog();
    return { saved: offers.length };
  },
);
