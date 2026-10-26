import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/auth/session";
import { listAdminFlags } from "@/features/flags/queries";
import { FlagsManager } from "./flags-manager";

export const metadata: Metadata = { title: "Etiquetas" };

export default async function AdminFlagsPage() {
  await requireAdmin("/admin/etiquetas");
  const flags = await listAdminFlags();

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Etiquetas de marca"
        description="Banderas con el color y el logo de cada marca o línea, en el borde de las tarjetas de producto."
      />
      <FlagsManager flags={flags} />
    </div>
  );
}
