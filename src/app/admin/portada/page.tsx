import { ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/features/auth/session";
import { listAdminBanners } from "@/features/banners/queries";
import { BannersManager } from "./banners-manager";

export const metadata: Metadata = { title: "Portada" };

export default async function AdminHomeBannersPage() {
  await requireAdmin("/admin/portada");
  const banners = await listAdminBanners();

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Anuncios de la portada"
        description="Bloques llamativos entre las secciones de la página de inicio: tus servicios, promociones y novedades."
        actions={
          <Button asChild variant="secondary">
            <Link href="/" target="_blank">
              <ExternalLinkIcon aria-hidden />
              Ver portada
            </Link>
          </Button>
        }
      />
      <BannersManager banners={banners} />
    </div>
  );
}
