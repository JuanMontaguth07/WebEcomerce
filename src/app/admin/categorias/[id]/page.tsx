import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/admin/delete-button";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { getAdminCategory, getCategoryOptions, getSpecDefinitions } from "@/features/admin/catalog";
import { deleteCategory } from "@/features/admin/catalog-actions";
import { requireAdmin } from "@/features/auth/session";
import { CategoryForm } from "../category-form";
import { architectKeys } from "@/features/compatibility/template";
import { asPartKind } from "@/features/compatibility/types";
import { ArchitectTemplate } from "./architect-template";
import { SpecDefinitions } from "./spec-definitions";

export const metadata: Metadata = { title: "Editar categoría" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditCategoryPage({ params }: PageProps<"/admin/categorias/[id]">) {
  const { id } = await params;
  await requireAdmin(`/admin/categorias/${id}`);
  if (!UUID.test(id)) notFound();

  const [category, all, definitions] = await Promise.all([
    getAdminCategory(id),
    getCategoryOptions(),
    getSpecDefinitions(id),
  ]);
  if (!category) notFound();

  // Una subcategoría sin pieza propia usa la de su categoría principal.
  const own = asPartKind(category.architect_part);
  const parent = all.find((item) => item.id === category.parent_id);
  const parentPart = asPartKind(parent?.architect_part);
  const inherited = !own && parent && parentPart ? { part: parentPart, from: parent.name } : null;
  const part = own ?? inherited?.part ?? null;

  return (
    <div className="grid max-w-4xl gap-6">
      <AdminPageHeader
        title={category.name}
        back={{ href: "/admin/categorias", label: "Categorías" }}
      />
      <CategoryForm
        categoryId={category.id}
        parents={all.filter((c) => c.id !== category.id && !c.parent_id)}
        initial={{
          name: category.name,
          slug: category.slug,
          parentId: category.parent_id ?? "",
          description: category.description ?? "",
          position: String(category.position),
          isActive: category.is_active,
          seoTitle: category.seo_title ?? "",
          seoDescription: category.seo_description ?? "",
          imagePath: category.image_path,
        }}
      />
      <section aria-labelledby="ficha" className="grid gap-4 rounded-xl border bg-card p-5 sm:p-6">
        <div className="grid gap-1">
          <h2 id="ficha" className="text-lg font-bold">
            Ficha técnica
          </h2>
          <p className="text-sm text-muted-foreground">
            Especificaciones que se completan en cada producto de esta categoría y se muestran en su
            ficha.
          </p>
        </div>
        <SpecDefinitions
          categoryId={category.id}
          definitions={definitions}
          architectKeys={part ? [...architectKeys(part)] : []}
        />
      </section>
      <section
        aria-labelledby="architect"
        className="grid gap-4 rounded-xl border bg-card p-5 sm:p-6"
      >
        <div className="grid gap-1">
          <h2 id="architect" className="text-lg font-bold">
            Kova Architect
          </h2>
          <p className="text-sm text-muted-foreground">
            Indica qué pieza del PC es esta categoría para que sus productos aparezcan en «Arma tu
            PC». La plantilla agrega las especificaciones que el configurador usa para comprobar la
            compatibilidad (marcadas «Architect»).
          </p>
        </div>
        <ArchitectTemplate
          categoryId={category.id}
          current={own}
          inherited={inherited}
          existingKeys={definitions.map((definition) => definition.key)}
        />
      </section>
      <section className="grid gap-3 rounded-xl border bg-card p-5 sm:p-6">
        <h2 className="text-lg font-bold">Eliminar</h2>
        <p className="text-sm text-muted-foreground">
          Solo se puede eliminar una categoría sin productos ni subcategorías.
        </p>
        <DeleteButton
          label="Eliminar categoría"
          confirmText={`¿Eliminar «${category.name}» y su ficha técnica? No se puede deshacer.`}
          action={deleteCategory.bind(null, { id: category.id })}
          redirectTo="/admin/categorias"
        />
      </section>
    </div>
  );
}
