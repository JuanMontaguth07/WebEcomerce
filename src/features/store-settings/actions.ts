"use server";

import { updateTag } from "next/cache";
import { adminAction } from "@/lib/admin-action";
import { STORE_SETTINGS_TAG } from "./queries";
import { storeSettingsSchema } from "./schemas";

export const updateStoreSettings = adminAction(
  storeSettingsSchema,
  async (values, { supabase }) => {
    const { error } = await supabase
      .from("store_settings")
      .update({
        whatsapp_number: values.whatsappNumber,
        support_email: values.supportEmail,
        support_hours: values.supportHours,
        legal_name: values.legalName,
        legal_nit: values.legalNit,
        legal_dv: values.legalDv,
        legal_address: values.legalAddress,
        legal_city: values.legalCity,
        nequi_number: values.nequiNumber,
        nequi_holder: values.nequiHolder,
      })
      .eq("id", true);
    if (error) throw error;
    updateTag(STORE_SETTINGS_TAG);
    return { saved: true };
  },
);
