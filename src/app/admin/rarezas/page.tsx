import { ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/features/auth/session";
import { listAdminRarities } from "@/features/rarities/queries";
import { RaritiesManager } from "./rarities-manager";

export const metadata: Metadata = { title: "Rarezas" };

export default async function AdminRaritiesPage() {
  await requireAdmin("/admin/rarezas");
  const rarities = await listAdminRarities();

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Rarezas"
        description="Niveles con color y efecto animado para que tus productos especiales resalten en toda la tienda."
        actions={
          <Button asChild variant="secondary">
            <Link href="/rarezas" target="_blank">
              <ExternalLinkIcon aria-hidden />
              Ver en la tienda
            </Link>
          </Button>
        }
      />
      <RaritiesManager rarities={rarities} />
    </div>
  );
}
