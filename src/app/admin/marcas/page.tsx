import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminEmpty, AdminPageHeader, AdminTable, AdminTh } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listAdminBrands } from "@/features/admin/catalog";
import { requireAdmin } from "@/features/auth/session";

export const metadata: Metadata = { title: "Marcas" };

export default async function AdminBrandsPage() {
  await requireAdmin("/admin/marcas");
  const brands = await listAdminBrands();

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Marcas"
        description={`${brands.length} ${brands.length === 1 ? "marca" : "marcas"}`}
        actions={
          <Button asChild>
            <Link href="/admin/marcas/nueva">
              <PlusIcon aria-hidden />
              Nueva marca
            </Link>
          </Button>
        }
      />
      {brands.length ? (
        <AdminTable caption="Marcas">
          <thead>
            <tr>
              <AdminTh>Marca</AdminTh>
              <AdminTh className="text-right">Productos</AdminTh>
              <AdminTh>Estado</AdminTh>
            </tr>
          </thead>
          <tbody>
            {brands.map((brand) => (
              <tr key={brand.id}>
                <td>
                  <Link
                    href={`/admin/marcas/${brand.id}`}
                    className="font-semibold hover:text-primary hover:underline"
                  >
                    {brand.name}
                  </Link>
                  <div className="font-mono text-xs text-muted-foreground">/{brand.slug}</div>
                </td>
                <td className="text-right tabular-nums">{brand.productCount}</td>
                <td>
                  <Badge variant={brand.isActive ? "success" : "outline"}>
                    {brand.isActive ? "Visible" : "Oculta"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      ) : (
        <AdminEmpty>Aún no hay marcas.</AdminEmpty>
      )}
    </div>
  );
}
