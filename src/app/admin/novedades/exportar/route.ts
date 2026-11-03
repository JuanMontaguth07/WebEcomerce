import { adminExport } from "@/features/admin/export";
import { listSubscribers } from "@/features/newsletter/queries";
import { SOURCE_LABELS } from "@/features/newsletter/types";
import { csvDate, csvResponse, toCsv } from "@/lib/csv";

/** Los correos activos (con su autorización), para cargarlos en el servicio de envío. */
export function GET() {
  return adminExport(async () => {
    const subscribers = (await listSubscribers()).filter((item) => item.status === "active");
    const csv = toCsv(
      ["Correo", "Desde", "Autorizó el", "Versión de la autorización"],
      subscribers.map((item) => [
        item.email,
        SOURCE_LABELS[item.source] ?? item.source,
        csvDate(item.consentedAt),
        item.consentVersion,
      ]),
    );
    return csvResponse("novedades", csv);
  });
}
