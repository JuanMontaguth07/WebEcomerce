import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { getBrandOptions, getCategoryOptions } from "@/features/admin/catalog";
import { requireAdmin } from "@/features/auth/session";
import { listAdminFlags } from "@/features/flags/queries";
import { listAdminRarities } from "@/features/rarities/queries";
import { EMPTY_PRODUCT, ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  await requireAdmin("/admin/productos/nuevo");
  const [categories, brands, rarities, flags] = await Promise.all([
    getCategoryOptions(),
    getBrandOptions(),
    listAdminRarities(),
    listAdminFlags(),
  ]);

  return (
    <div className="grid max-w-4xl gap-6">
      <AdminPageHeader
        title="Nuevo producto"
        description="Se crea oculto. Luego podrás agregar imágenes, ficha técnica y stock."
        back={{ href: "/admin/productos", label: "Productos" }}
      />
      <ProductForm
        initial={EMPTY_PRODUCT}
        categories={categories}
        brands={brands}
        rarities={rarities}
        flags={flags}
      />
    </div>
  );
}
