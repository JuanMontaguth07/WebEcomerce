import { DownloadIcon } from "lucide-react";
import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/features/auth/session";
import { listSubscribers } from "@/features/newsletter/queries";
import { SubscribersTable } from "./subscribers-table";

export const metadata: Metadata = { title: "Novedades" };

export default async function NewsletterPage() {
  await requireAdmin("/admin/novedades");
  const subscribers = await listSubscribers();
  const active = subscribers.filter((item) => item.status === "active").length;

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Novedades"
        description="Quienes se suscribieron con su autorización (en Arma tu PC y en el pie de página). Exporta los activos para cargarlos en el servicio con que envíes los correos; cada correo debe llevar cómo darse de baja."
        actions={
          <Button asChild variant="secondary" disabled={!active}>
            <a href="/admin/novedades/exportar" download>
              <DownloadIcon aria-hidden />
              Exportar activos ({active})
            </a>
          </Button>
        }
      />
      <SubscribersTable subscribers={subscribers} />
    </div>
  );
}
