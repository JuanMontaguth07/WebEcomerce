import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/auth/session";
import { getStoreSettingsForAdmin } from "@/features/store-settings/queries";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Configuración" };

export default async function SettingsPage() {
  await requireAdmin("/admin/configuracion");
  const settings = await getStoreSettingsForAdmin();

  return (
    <div className="grid max-w-3xl gap-6">
      <AdminPageHeader
        title="Configuración de la tienda"
        description="Anuncio, contacto, pagos y datos legales que ven tus clientes."
      />
      <SettingsForm
        initial={{
          whatsappNumber: settings.whatsappNumber ?? "",
          supportEmail: settings.supportEmail ?? "",
          supportHours: settings.supportHours ?? "",
          legalName: settings.legalName ?? "",
          legalNit: settings.legalNit ?? "",
          legalDv: settings.legalDv ?? "",
          legalAddress: settings.legalAddress ?? "",
          legalCity: settings.legalCity ?? "",
          nequiNumber: settings.nequiNumber ?? "",
          nequiHolder: settings.nequiHolder ?? "",
          announcementText: settings.announcementText ?? "",
          announcementHref: settings.announcementHref ?? "",
          announcementEnabled: settings.announcementEnabled,
        }}
      />
    </div>
  );
}
