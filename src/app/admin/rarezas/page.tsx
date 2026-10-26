import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/auth/session";
import { listAdminRarities } from "@/features/rarities/queries";
import { RaritiesManager } from "./rarities-manager";

export const metadata: Metadata = { title: "Rarezas" };

export default async function AdminRaritiesPage() {
  await requireAdmin("/admin/rarezas");
  const rarities = await listAdminRarities();

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Rarezas"
        description="Niveles de calidad, de Común a Legendario. Cada uno tiene color y efecto animado en las tarjetas de producto."
      />
      <RaritiesManager rarities={rarities} />
    </div>
  );
}
