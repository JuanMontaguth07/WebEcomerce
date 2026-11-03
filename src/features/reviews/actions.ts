"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { adminAction } from "@/lib/admin-action";
import { STORE_REVIEWS_TAG } from "./types";

/** Publica, rechaza o devuelve a revisión una opinión. */
export const moderateReview = adminAction(
  z.object({ id: z.uuid(), status: z.enum(["approved", "rejected", "pending"]) }),
  async ({ id, status }, { supabase }) => {
    const { error } = await supabase.rpc("moderate_store_review", {
      p_review_id: id,
      p_status: status,
    });
    if (error) throw error;
    updateTag(STORE_REVIEWS_TAG);
    return { id, status };
  },
);
