import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/admin/delete-button";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { getAdminBrand } from "@/features/admin/catalog";
import { deleteBrand } from "@/features/admin/catalog-actions";
import { requireAdmin } from "@/features/auth/session";
import { BrandForm } from "../brand-form";

export const metadata: Metadata = { title: "Editar marca" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditBrandPage({ params }: PageProps<"/admin/marcas/[id]">) {
  const { id } = await params;
  await requireAdmin(`/admin/marcas/${id}`);
  if (!UUID.test(id)) notFound();
  const brand = await getAdminBrand(id);
  if (!brand) notFound();

  return (
    <div className="grid max-w-3xl gap-6">
      <AdminPageHeader title={brand.name} back={{ href: "/admin/marcas", label: "Marcas" }} />
      <BrandForm
        brandId={brand.id}
        initial={{
          name: brand.name,
          slug: brand.slug,
          description: brand.description ?? "",
          isActive: brand.is_active,
          logoPath: brand.logo_path,
        }}
      />
      <section className="grid gap-3 rounded-xl border bg-card p-5 sm:p-6">
        <h2 className="text-lg font-bold">Eliminar</h2>
        <p className="text-sm text-muted-foreground">
          Solo se puede eliminar una marca sin productos.
        </p>
        <DeleteButton
          label="Eliminar marca"
          confirmText={`¿Eliminar la marca «${brand.name}»? No se puede deshacer.`}
          action={deleteBrand.bind(null, { id: brand.id })}
          redirectTo="/admin/marcas"
        />
      </section>
    </div>
  );
}
