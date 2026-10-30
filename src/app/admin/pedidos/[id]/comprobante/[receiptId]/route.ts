import { adminExport } from "@/features/admin/export";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** La imagen de un comprobante, solo para administradores (la tabla es privada). */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/admin/pedidos/[id]/comprobante/[receiptId]">,
) {
  const { id, receiptId } = await params;
  if (!UUID.test(id) || !UUID.test(receiptId))
    return new Response("No encontrado", { status: 404 });
  return adminExport(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payment_receipts")
      .select("image, mime")
      .eq("id", receiptId)
      .eq("order_id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return new Response("No encontrado", { status: 404 });
    // La API entrega bytea como texto hexadecimal («\x89504e…»).
    const bytes = Buffer.from(String(data.image).replace(/^\\x/, ""), "hex");
    return new Response(bytes, {
      headers: {
        "Content-Type": data.mime,
        "Cache-Control": "private, max-age=300",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
