import type { NextRequest } from "next/server";
import { adminExport, collectPages } from "@/features/admin/export";
import {
  ACTION_LABELS,
  ACTIVITY_GROUPS,
  actorName,
  changeRows,
  describeActivity,
  type ActivityAction,
  type ActivityGroup,
} from "@/features/activity/format";
import { listActivity } from "@/features/activity/queries";
import { csvDate, csvResponse, toCsv } from "@/lib/csv";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function GET(request: NextRequest) {
  return adminExport(async () => {
    const params = request.nextUrl.searchParams;
    const rawGroup = params.get("grupo") ?? "";
    const rawAction = params.get("accion") ?? "";
    const rawId = params.get("id") ?? "";

    const rows = await collectPages(async (page) => {
      const result = await listActivity({
        group: Object.hasOwn(ACTIVITY_GROUPS, rawGroup) ? (rawGroup as ActivityGroup) : undefined,
        action: Object.hasOwn(ACTION_LABELS, rawAction) ? (rawAction as ActivityAction) : undefined,
        entityId: UUID.test(rawId) ? rawId : undefined,
        q: params.get("q") ?? undefined,
        page,
        limit: 1000,
      });
      return {
        items: result.entries.map((entry) => ({ entry, names: result.names })),
        pageCount: result.pageCount,
      };
    });

    const csv = toCsv(
      ["Fecha", "Persona", "Qué pasó", "Motivo", "Detalle"],
      rows.map(({ entry, names }) => [
        csvDate(entry.occurredAt),
        actorName(entry),
        describeActivity(entry),
        entry.reason,
        changeRows(entry, names)
          .map((row) =>
            row.before === undefined
              ? `${row.label}: ${row.after}`
              : `${row.label}: ${row.before} → ${row.after}`,
          )
          .join(" | "),
      ]),
    );
    return csvResponse("actividad", csv);
  });
}
