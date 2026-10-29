import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { getBrandOptions, getCategoryOptions } from "@/features/admin/catalog";
import { requireAdmin } from "@/features/auth/session";
import { listAdminFlags } from "@/features/flags/queries";
import { listAdminRarities } from "@/features/rarities/queries";
import { ProductCardPreview, ProductDraftProvider } from "../product-draft";
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
    <div className="grid gap-6">
      <AdminPageHeader
        title="Nuevo producto"
        description="Se crea oculto. Luego podrás agregar imágenes, ficha técnica y stock."
        back={{ href: "/admin/productos", label: "Productos" }}
      />
      <ProductDraftProvider initial={EMPTY_PRODUCT}>
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <ProductForm
            initial={EMPTY_PRODUCT}
            categories={categories}
            brands={brands}
            rarities={rarities}
            flags={flags}
          />
          <section
            aria-label="Así se verá en la tienda"
            className="grid gap-3 rounded-xl border bg-card p-5 xl:sticky xl:top-20"
          >
            <h2 className="text-lg font-bold">Así se verá en la tienda</h2>
            <ProductCardPreview
              categories={categories}
              brands={brands}
              rarities={rarities}
              flags={flags}
              image={null}
              keySpecs={[]}
              stock={0}
            />
          </section>
        </div>
      </ProductDraftProvider>
    </div>
  );
}
