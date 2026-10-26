import { DownloadIcon } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { ActivityFeed } from "@/components/admin/activity-feed";
import {
  AdminEmpty,
  AdminPageHeader,
  AdminPagination,
  AdminSearch,
  FilterChips,
  pageParam,
  param,
} from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import {
  ACTION_LABELS,
  ACTIVITY_GROUPS,
  type ActivityAction,
  type ActivityGroup,
} from "@/features/activity/format";
import { listActivity } from "@/features/activity/queries";
import { requireAdmin } from "@/features/auth/session";

export const metadata: Metadata = { title: "Actividad" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GROUPS = Object.keys(ACTIVITY_GROUPS) as ActivityGroup[];
const ACTIONS = Object.keys(ACTION_LABELS) as ActivityAction[];

type Params = { grupo?: string; accion?: string; id?: string; q?: string; pagina?: number };

function href(params: Params, base = "/admin/actividad") {
  const search = new URLSearchParams();
  if (params.grupo) search.set("grupo", params.grupo);
  if (params.accion) search.set("accion", params.accion);
  if (params.id) search.set("id", params.id);
  if (params.q) search.set("q", params.q);
  if (params.pagina && params.pagina > 1) search.set("pagina", String(params.pagina));
  const query = search.toString();
  return `${base}${query ? `?${query}` : ""}` as Route;
}

export default async function ActivityPage({ searchParams }: PageProps<"/admin/actividad">) {
  await requireAdmin("/admin/actividad");
  const params = await searchParams;
  const rawGroup = param(params.grupo);
  const group = GROUPS.includes(rawGroup as ActivityGroup)
    ? (rawGroup as ActivityGroup)
    : undefined;
  const rawAction = param(params.accion);
  const action = ACTIONS.includes(rawAction as ActivityAction)
    ? (rawAction as ActivityAction)
    : undefined;
  const rawId = param(params.id);
  const entityId = rawId && UUID.test(rawId) ? rawId : undefined;
  const q = param(params.q);
  const page = pageParam(params.pagina);

  const { entries, existing, names, total, pageCount } = await listActivity({
    group,
    action,
    entityId,
    q,
    page,
  });
  const current = { grupo: group, accion: action, id: entityId, q };
  const subject = entityId ? entries[0]?.entityLabel : undefined;

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Actividad"
        description={
          entityId
            ? `Historial de ${subject ? `«${subject}»` : "este registro"} · ${total} ${total === 1 ? "cambio" : "cambios"}`
            : "Todo lo que pasa en la tienda queda aquí, aunque después se elimine. No se puede editar ni borrar."
        }
        back={entityId ? { href: "/admin/actividad", label: "Toda la actividad" } : undefined}
        actions={
          <Button asChild variant="secondary">
            <Link href={href(current, "/admin/actividad/exportar")} prefetch={false}>
              <DownloadIcon aria-hidden />
              Exportar CSV
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FilterChips
            label="Filtrar por área"
            items={[undefined, ...GROUPS].map((value) => ({
              key: value ?? "all",
              label: value ? ACTIVITY_GROUPS[value].label : "Todo",
              href: href({ ...current, grupo: value }),
              active: value === group,
            }))}
          />
          <AdminSearch
            action="/admin/actividad"
            defaultValue={q}
            placeholder="Nombre, persona o motivo"
            hidden={{ grupo: group, accion: action, id: entityId }}
          />
        </div>
        <FilterChips
          label="Filtrar por tipo de cambio"
          size="sm"
          items={[undefined, ...ACTIONS].map((value) => ({
            key: value ?? "all",
            label: value ? ACTION_LABELS[value] : "Todos los cambios",
            href: href({ ...current, accion: value }),
            active: value === action,
          }))}
        />
      </div>

      {entries.length ? (
        <div className="rounded-xl border bg-card p-5 sm:p-6">
          <ActivityFeed entries={entries} existing={existing} names={names} />
        </div>
      ) : (
        <AdminEmpty>
          {group || action || q || entityId
            ? "No hay actividad con este filtro."
            : "Todavía no hay actividad. Cada cambio que hagas en el panel aparecerá aquí."}
        </AdminEmpty>
      )}

      <AdminPagination
        page={page}
        pageCount={pageCount}
        hrefFor={(p) => href({ ...current, pagina: p })}
      />
    </div>
  );
}
