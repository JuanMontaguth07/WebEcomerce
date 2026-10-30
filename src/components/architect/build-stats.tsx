import { ActivityIcon, GaugeIcon, InfoIcon, ScaleIcon, TargetIcon, ZapIcon } from "lucide-react";
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
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out-soft", tone)}
          style={{ width: `${value}%` }}
        />
      </div>
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
 * Estadísticas del equipo: rendimiento estimado, para qué alcanza, equilibrio
 * entre procesador y gráfica, consumo frente a la fuente y rendimiento por precio.
 */
export function BuildStatsPanel({ stats }: { stats: BuildStats }) {
  const id = useId();
  const { performance, tier, balance, power, value, missingScore, notes } = stats;
  const missing = missingScore
    .map((kind) => (kind === "cpu" ? "del procesador" : "de la gráfica"))
    .join(" y ");

  return (
    <section
      aria-labelledby={`${id}-stats`}
      className="grid gap-3 rounded-xl border bg-background p-3"
    >
      <h2 id={`${id}-stats`} className="flex items-center gap-2 text-sm font-semibold">
        <ActivityIcon className="size-4 text-primary" aria-hidden />
        Estadísticas
        <span className="text-xs font-normal text-muted-foreground">(estimadas)</span>
      </h2>

      {performance ? (
        <div className="grid gap-2.5">
          <Meter label="Juegos" value={performance.gaming} tone="bg-primary" />
          <Meter label="Trabajo y creación" value={performance.work} tone="bg-[#60a5fa]" />
        </div>
      ) : (
        missing && (
          <p className="text-xs text-muted-foreground">
            Falta el puntaje de rendimiento {missing} para estimar el rendimiento.
          </p>
        )
      )}

      {tier && (
        <p className="grid gap-0.5 rounded-lg bg-primary-soft px-3 py-2">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
            <TargetIcon className="size-4" aria-hidden />
            Ideal para: {tier.label}
          </span>
          <span className="text-xs text-muted-foreground">{tier.detail}</span>
        </p>
      )}

      {balance && (
        <p
          className={cn(
            "flex items-start gap-1.5 text-xs",
            balance.kind === "balanced" ? "text-success" : "text-warning",
          )}
        >
          <ScaleIcon className="mt-px size-3.5 shrink-0" aria-hidden />
          {balance.message}
        </p>
      )}

      {power && (
        <p className={cn("flex items-start gap-1.5 text-xs", POWER_TEXT[power.level])}>
          <ZapIcon className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>
            Consumo ~{power.estimate} W
            {power.psu !== null && (
              <>
                {" "}
                · fuente {power.psu} W
                {power.headroom !== null && power.headroom >= 0 && (
                  <> · margen {percent.format(power.headroom)}</>
                )}
              </>
            )}
            {power.level === "tight" && ". Va justa: mejor una con 20% o más de margen."}
            {power.level === "over" && ". No alcanza: elige una fuente más potente."}
            {power.level === "unknown" && ". Elige una fuente para comparar."}
          </span>
        </p>
      )}

      {value !== null && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <GaugeIcon className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>
            Rendimiento por precio:{" "}
            <strong className="text-foreground">{decimal.format(value)} puntos</strong> por cada
            millón (más es mejor; sirve para comparar opciones).
          </span>
        </p>
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
