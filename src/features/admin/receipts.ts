import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AdminReceipt = {
  id: string;
  status: "pending" | "approved" | "rejected" | "replaced";
  width: number | null;
  height: number | null;
  note: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewer: string | null;
  createdAt: string;
};

/** Comprobantes de un pedido, el más reciente primero (sin la imagen: va por su ruta). */
export async function getOrderReceipts(orderId: string): Promise<AdminReceipt[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_receipts")
    .select(
      "id, status, width, height, note, review_note, reviewed_at, created_at, reviewer:profiles(full_name, email)",
    )
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    status: row.status as AdminReceipt["status"],
    width: row.width,
    height: row.height,
    note: row.note,
    reviewNote: row.review_note,
    reviewedAt: row.reviewed_at,
    reviewer: row.reviewer?.full_name ?? row.reviewer?.email ?? null,
    createdAt: row.created_at,
  }));
}

/** Comprobantes que esperan revisión (para el resumen del panel). */
export async function getPendingReceiptCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("payment_receipts")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}
