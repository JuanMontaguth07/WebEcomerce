import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { listAdminFeaturedBuilds, listRecentBuilds } from "@/features/architect/featured-queries";
import { requireAdmin } from "@/features/auth/session";
import { FeaturedBuildsManager } from "./featured-builds-manager";

export const metadata: Metadata = { title: "PCs armadas" };

export default async function FeaturedBuildsPage() {
  await requireAdmin("/admin/pcs-armadas");
  const [featured, recent] = await Promise.all([listAdminFeaturedBuilds(), listRecentBuilds(30)]);

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="PCs armadas"
        description="Equipos recomendados que salen en Arma tu PC para abrir y personalizar. Ármalos en el configurador, «Guardar y compartir», y pega aquí el enlace."
      />
      <FeaturedBuildsManager featured={featured} recent={recent} />
    </div>
  );
}
