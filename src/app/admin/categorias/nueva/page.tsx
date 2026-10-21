import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { getCategoryOptions } from "@/features/admin/catalog";
import { requireAdmin } from "@/features/auth/session";
import { CategoryForm, EMPTY_CATEGORY } from "../category-form";

export const metadata: Metadata = { title: "Nueva categoría" };

export default async function NewCategoryPage() {
  await requireAdmin("/admin/categorias/nueva");
  const categories = await getCategoryOptions();

  return (
    <div className="grid max-w-3xl gap-6">
      <AdminPageHeader
        title="Nueva categoría"
        description="Después de crearla podrás definir su ficha técnica."
        back={{ href: "/admin/categorias", label: "Categorías" }}
      />
      <CategoryForm initial={EMPTY_CATEGORY} parents={categories.filter((c) => !c.parent_id)} />
    </div>
  );
}
