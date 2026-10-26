import {
  BoxesIcon,
  ClipboardListIcon,
  FolderTreeIcon,
  GemIcon,
  ImageIcon,
  ListChecksIcon,
  SettingsIcon,
  SlidersHorizontalIcon,
  TagIcon,
  TruckIcon,
  WarehouseIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import {
  activityHref,
  actorName,
  changeRows,
  describeActivity,
  type ActivityEntity,
  type ActivityEntry,
  type ReferenceNames,
} from "@/features/activity/format";
import { cn } from "@/lib/utils";

const ICONS: Record<ActivityEntity, React.ComponentType<{ className?: string }>> = {
  product: BoxesIcon,
  product_image: ImageIcon,
  product_specs: ListChecksIcon,
  category: FolderTreeIcon,
  spec_definition: SlidersHorizontalIcon,
  brand: TagIcon,
  order: ClipboardListIcon,
  inventory: WarehouseIcon,
  shipping_rate: TruckIcon,
  store_settings: SettingsIcon,
  rarity: GemIcon,
};

const ACTION_TONE = {
  create: "bg-success/10 text-success",
  update: "bg-primary-soft text-primary",
  delete: "bg-destructive/10 text-destructive",
} as const;

const TIME_ZONE = "America/Bogota";
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE });
const dayTitle = new Intl.DateTimeFormat("es-CO", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const time = new Intl.DateTimeFormat("es-CO", { timeZone: TIME_ZONE, timeStyle: "short" });

function groupByDay(entries: ActivityEntry[]) {
  const today = dayKey.format(new Date());
  const yesterday = dayKey.format(new Date(Date.now() - 86_400_000));
  const groups = new Map<string, { title: string; entries: ActivityEntry[] }>();
  for (const entry of entries) {
    const date = new Date(entry.occurredAt);
    const key = dayKey.format(date);
    const title = key === today ? "Hoy" : key === yesterday ? "Ayer" : dayTitle.format(date);
    const group = groups.get(key) ?? { title, entries: [] };
    group.entries.push(entry);
    groups.set(key, group);
  }
  return [...groups.entries()];
}

/**
 * Línea de tiempo del historial general. `compact` oculta el detalle de
 * cambios (resumen del panel, tarjetas laterales).
 */
export function ActivityFeed({
  entries,
  existing,
  names,
  compact = false,
}: {
  entries: ActivityEntry[];
  existing: Set<string>;
  names: ReferenceNames;
  compact?: boolean;
}) {
  return (
    <div className="grid gap-6">
      {groupByDay(entries).map(([key, group]) => (
        <section key={key} aria-label={group.title} className="grid gap-2">
          <h3 className="text-eyebrow font-mono text-muted-foreground first-letter:uppercase">
            {group.title}
          </h3>
          <ol className="grid">
            {group.entries.map((entry) => (
              <ActivityItem
                key={entry.id}
                entry={entry}
                href={activityHref(entry, existing)}
                names={names}
                compact={compact}
              />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function ActivityItem({
  entry,
  href,
  names,
  compact,
}: {
  entry: ActivityEntry;
  href: string | null;
  names: ReferenceNames;
  compact: boolean;
}) {
  const Icon = ICONS[entry.entity];
  const rows = compact ? [] : changeRows(entry, names);
  const sentence = describeActivity(entry);

  return (
    <li className="relative flex gap-3 pb-4 last:pb-0 [&:not(:last-child)]:before:absolute [&:not(:last-child)]:before:top-9 [&:not(:last-child)]:before:bottom-1 [&:not(:last-child)]:before:left-4 [&:not(:last-child)]:before:w-px [&:not(:last-child)]:before:bg-border">
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full",
          ACTION_TONE[entry.action],
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="grid min-w-0 flex-1 gap-1 pt-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="min-w-0 text-sm [overflow-wrap:anywhere]">
            <strong className="font-semibold">{actorName(entry)}</strong> {sentence}
          </p>
          <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
            <time dateTime={entry.occurredAt}>{time.format(new Date(entry.occurredAt))}</time>
          </span>
        </div>
        {entry.reason && (
          <p className="text-sm [overflow-wrap:anywhere] text-muted-foreground">
            <span className="font-medium text-foreground">Motivo:</span> {entry.reason}
          </p>
        )}
        {(href || rows.length > 0) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {href && (
              <Link href={href as Route} className="font-semibold text-primary hover:underline">
                Abrir
              </Link>
            )}
            {rows.length > 0 && (
              <details className="group w-full">
                <summary className="w-fit cursor-pointer font-semibold text-muted-foreground select-none hover:text-foreground">
                  {entry.action === "update"
                    ? `Ver ${rows.length} ${rows.length === 1 ? "cambio" : "cambios"}`
                    : "Ver datos"}
                </summary>
                <dl className="mt-2 grid gap-x-4 gap-y-1.5 rounded-lg border bg-background p-3 sm:grid-cols-[minmax(8rem,auto)_1fr]">
                  {rows.map((row) => (
                    <div key={row.field} className="contents">
                      <dt className="text-muted-foreground">{row.label}</dt>
                      <dd className="min-w-0 [overflow-wrap:anywhere]">
                        {row.before !== undefined && (
                          <>
                            <del className="text-muted-foreground decoration-destructive/60">
                              {row.before}
                            </del>
                            <span aria-hidden className="mx-1.5 text-muted-foreground">
                              →
                            </span>
                            <span className="sr-only"> cambió a </span>
                          </>
                        )}
                        <span className="font-medium">{row.after}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
