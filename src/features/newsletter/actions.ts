"use server";

import { z } from "zod";
import { adminAction } from "@/lib/admin-action";

/** Borra un correo de la lista (cuando el titular pide suprimir sus datos). */
export const deleteSubscriber = adminAction(
  z.object({ id: z.uuid() }),
  async ({ id }, { supabase }) => {
    const { error } = await supabase.from("newsletter_subscribers").delete().eq("id", id);
    if (error) throw error;
    return { id };
  },
);
