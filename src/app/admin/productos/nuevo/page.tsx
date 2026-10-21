import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { getBrandOptions, getCategoryOptions } from "@/features/admin/catalog";
import { requireAdmin } from "@/features/auth/session";
import { EMPTY_PRODUCT, ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  await requireAdmin("/admin/productos/nuevo");
  const [categories, brands] = await Promise.all([getCategoryOptions(), getBrandOptions()]);

  return (
    <div className="grid max-w-4xl gap-6">
      <AdminPageHeader
        title="Nuevo producto"
        description="Se crea oculto. Luego podrás agregar imágenes, ficha técnica y stock."
        back={{ href: "/admin/productos", label: "Productos" }}
      />
      <ProductForm initial={EMPTY_PRODUCT} categories={categories} brands={brands} />
    </div>
  );
}
