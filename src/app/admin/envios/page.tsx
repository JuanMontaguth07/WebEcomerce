import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/auth/session";
import { listShippingRates } from "@/features/shipping/queries";
import { RatesManager } from "./rates-manager";

export const metadata: Metadata = { title: "Envíos" };

export default async function ShippingPage() {
  await requireAdmin("/admin/envios");
  const rates = await listShippingRates();

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Envíos"
        description="El checkout muestra el costo según el departamento y la ciudad. Sin tarifa, el envío queda «por confirmar»."
      />
      <RatesManager rates={rates} />
    </div>
  );
}
