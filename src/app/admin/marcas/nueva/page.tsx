import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/auth/session";
import { BrandForm } from "../brand-form";

export const metadata: Metadata = { title: "Nueva marca" };

export default async function NewBrandPage() {
  await requireAdmin("/admin/marcas/nueva");
  return (
    <div className="grid max-w-3xl gap-6">
      <AdminPageHeader title="Nueva marca" back={{ href: "/admin/marcas", label: "Marcas" }} />
      <BrandForm
        initial={{ name: "", slug: "", description: "", isActive: true, logoPath: null }}
      />
    </div>
  );
}
