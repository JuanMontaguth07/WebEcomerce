import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminEmpty, AdminPageHeader, AdminTable, AdminTh } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listAdminCategories } from "@/features/admin/catalog";
import { requireAdmin } from "@/features/auth/session";

export const metadata: Metadata = { title: "Categorías" };

export default async function AdminCategoriesPage() {
  await requireAdmin("/admin/categorias");
  const categories = await listAdminCategories();

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Categorías"
        description="Organizan el menú, las páginas de categoría y la ficha técnica de cada producto."
        actions={
          <Button asChild>
            <Link href="/admin/categorias/nueva">
              <PlusIcon aria-hidden />
              Nueva categoría
            </Link>
          </Button>
        }
      />
      {categories.length ? (
        <AdminTable caption="Categorías">
          <thead>
            <tr>
              <AdminTh>Orden</AdminTh>
              <AdminTh>Categoría</AdminTh>
              <AdminTh>Padre</AdminTh>
              <AdminTh className="text-right">Productos</AdminTh>
              <AdminTh className="text-right">Especificaciones</AdminTh>
              <AdminTh>Estado</AdminTh>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td className="font-mono text-muted-foreground">{category.position}</td>
                <td>
                  <Link
                    href={`/admin/categorias/${category.id}`}
                    className="font-semibold hover:text-primary hover:underline"
                  >
                    {category.name}
                  </Link>
                  <div className="font-mono text-xs text-muted-foreground">/{category.slug}</div>
                </td>
                <td className="text-muted-foreground">{category.parent ?? "—"}</td>
                <td className="text-right tabular-nums">{category.productCount}</td>
                <td className="text-right tabular-nums">{category.specCount}</td>
                <td>
                  <Badge variant={category.isActive ? "success" : "outline"}>
                    {category.isActive ? "Visible" : "Oculta"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      ) : (
        <AdminEmpty>Aún no hay categorías.</AdminEmpty>
      )}
    </div>
  );
}
