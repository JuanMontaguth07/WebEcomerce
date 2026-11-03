import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/auth/session";
import { listAdminReviews } from "@/features/reviews/queries";
import { ReviewsManager } from "./reviews-manager";

export const metadata: Metadata = { title: "Opiniones" };

export default async function ReviewsPage() {
  await requireAdmin("/admin/opiniones");
  const reviews = await listAdminReviews();

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Opiniones"
        description="Lo que opinan los compradores desde su pedido entregado. Nada sale en la tienda hasta que lo publiques; se muestra con el nombre que eligió el cliente y «Compra verificada»."
      />
      <ReviewsManager reviews={reviews} />
    </div>
  );
}
