import { ActivityIcon, InfoIcon } from "lucide-react";
import { useId } from "react";
import type { BuildStats } from "@/features/architect/stats";
import { cn } from "@/lib/utils";

const decimal = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat("es-CO", { style: "percent", maximumFractionDigits: 0 });

function Meter({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="grid gap-1">
      <span className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold tabular-nums">{value}/100</span>
      </span>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        className="h-2 overflow-hidden rounded-full bg-secondary"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-700 ease-out-soft", tone)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function Tile({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid content-between gap-2 rounded-xl border bg-card p-3 transition-[border-color,translate] duration-300 ease-out-soft hover:-translate-y-0.5 hover:border-primary/40",
        className,
      )}
    >
      <span className="text-xs font-semibold">{label}</span>
      {children}
    </div>
  );
}

const POWER_TEXT = {
  ok: "text-success",
  tight: "text-warning",
  over: "text-destructive",
  unknown: "text-muted-foreground",
} as const;

/**
 * Estadísticas del equipo en tarjetas con números grandes: rendimiento
 * estimado, para qué alcanza, equilibrio entre procesador y gráfica, consumo
 * frente a la fuente y rendimiento por precio.
 */
export function BuildStatsPanel({ stats }: { stats: BuildStats }) {
  const id = useId();
  const { performance, tier, balance, power, value, missingScore, notes } = stats;
  const missing = missingScore
    .map((kind) => (kind === "cpu" ? "del procesador" : "de la gráfica"))
    .join(" y ");

  return (
    <section aria-labelledby={`${id}-stats`} className="grid gap-2.5">
      <h2 id={`${id}-stats`} className="flex items-center gap-2 text-sm font-semibold">
        <ActivityIcon className="size-4 text-primary" aria-hidden />
        Estadísticas
        <span className="text-xs font-normal text-muted-foreground">(estimadas)</span>
      </h2>

      <div className="grid grid-cols-2 gap-2">
        {performance ? (
          <Tile
            label="Rendimiento"
            className="col-span-2 bg-[radial-gradient(120%_90%_at_100%_0%,var(--primary-soft),var(--card)_65%)]"
          >
            <span className="font-heading text-4xl leading-none font-extrabold text-primary font-stretch-112% tabular-nums">
              {performance.gaming}
              <span className="ml-1 text-sm font-semibold text-muted-foreground">
                /100 en juegos
              </span>
            </span>
            <div className="grid gap-2">
              <Meter
                label="Juegos"
                value={performance.gaming}
                tone="bg-[linear-gradient(90deg,var(--primary),var(--zone-2,var(--primary)))]"
              />
              <Meter label="Trabajo y creación" value={performance.work} tone="bg-tech" />
            </div>
          </Tile>
        ) : (
          missing && (
            <p className="col-span-2 rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
              Falta el puntaje de rendimiento {missing} para estimar el rendimiento.
            </p>
          )
        )}

        {tier && (
          <Tile label="Ideal para" className="col-span-2">
            <span className="font-heading text-2xl leading-tight font-extrabold text-primary font-stretch-112%">
              {tier.label}
            </span>
            <span className="text-xs text-muted-foreground">{tier.detail}</span>
          </Tile>
        )}

        {power && (
          <Tile label="Consumo" className={value === null ? "col-span-2" : undefined}>
            <span className="font-heading text-3xl leading-none font-extrabold font-stretch-112% tabular-nums">
              ~{power.estimate}
              <span className="ml-0.5 text-sm font-semibold text-muted-foreground">W</span>
            </span>
            <span className={cn("text-xs font-medium", POWER_TEXT[power.level])}>
              {power.psu !== null ? `Fuente ${power.psu} W` : "Elige una fuente"}
              {power.headroom !== null &&
                power.headroom >= 0 &&
                ` · margen ${percent.format(power.headroom)}`}
              {power.level === "tight" && ". Va justa."}
              {power.level === "over" && ". No alcanza."}
            </span>
          </Tile>
        )}

        {value !== null && (
          <Tile label="Por precio" className={power ? undefined : "col-span-2"}>
            <span className="font-heading text-3xl leading-none font-extrabold font-stretch-112% tabular-nums">
              {decimal.format(value)}
            </span>
            <span className="text-xs text-muted-foreground">puntos por millón (más es mejor)</span>
          </Tile>
        )}

        {balance && (
          <p
            className={cn(
              "col-span-2 flex items-start gap-2 rounded-xl border bg-card p-3 text-xs font-medium",
              balance.kind === "balanced" ? "text-success" : "text-warning",
            )}
          >
            <span
              aria-hidden
              className="mt-1 size-2 shrink-0 rounded-full bg-current shadow-[0_0_0_4px_color-mix(in_oklab,currentColor_20%,transparent)]"
            />
            {balance.message}
          </p>
        )}
      </div>

      {power?.level === "tight" && (
        <p className="text-xs text-warning">Mejor una fuente con 20% o más de margen.</p>
      )}
      {power?.level === "over" && (
        <p className="text-xs text-destructive">Elige una fuente más potente.</p>
      )}

      {notes.length > 0 && (
        <ul className="grid gap-1 text-xs text-warning">
          {notes.map((note) => (
            <li key={note} className="flex items-start gap-1.5">
              <InfoIcon className="mt-px size-3.5 shrink-0" aria-hidden />
              {note}
            </li>
          ))}
        </ul>
      )}

      <p className="text-[0.6875rem] text-muted-foreground">
        Estimación relativa a partir del puntaje de rendimiento de cada pieza (1 a 100), no FPS
        medidos.
      </p>
    </section>
  );
}
