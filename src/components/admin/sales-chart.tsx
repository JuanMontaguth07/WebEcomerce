import type { SalesDay } from "@/features/admin/queries";
import { formatCOP } from "@/lib/format";
import { cn } from "@/lib/utils";

const compact = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });
const shortDay = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const longDay = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** Las fechas llegan como «2026-10-26» (día de Colombia); se leen en UTC para no correr el día. */
const asDate = (day: string) => new Date(`${day}T00:00:00Z`);

/** Escala limpia para el eje: 1, 2, 2,5 o 5 × 10ⁿ por encima del máximo. */
function niceMax(value: number) {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((factor) => factor * power >= value) ?? 10;
  return step * power;
}

/**
 * Ventas por día en columnas (una sola serie: el título la nombra). El detalle
 * de cada día aparece al pasar el cursor y en la tabla desplegable.
 */
export function SalesChart({ days }: { days: SalesDay[] }) {
  const max = niceMax(Math.max(...days.map((day) => day.revenue), 0));
  const hasSales = days.some((day) => day.revenue > 0);
  const ticks = [max, max / 2, 0];
  const labelEvery = Math.ceil(days.length / 6);

  return (
    <figure className="grid gap-3">
      <div className="grid grid-cols-[auto_1fr] gap-x-3">
        <div
          aria-hidden
          className="flex h-44 flex-col justify-between text-right font-mono text-[0.7rem] text-muted-foreground tabular-nums"
        >
          {ticks.map((tick) => (
            <span key={tick} className="-translate-y-1/2 last:translate-y-1/2">
              {tick === 0 ? "0" : `$${compact.format(tick)}`}
            </span>
          ))}
        </div>

        <div className="relative h-44">
          {/* Líneas guía: finas y recesivas. */}
          <div aria-hidden className="absolute inset-0 flex flex-col justify-between">
            {ticks.map((tick) => (
              <span key={tick} className="h-px bg-border" />
            ))}
          </div>

          <ol aria-label="Ventas por día" className="absolute inset-0 flex items-end gap-0.5">
            {days.map((day, index) => {
              const height = (day.revenue / max) * 100;
              const align =
                index < 4
                  ? "left-0"
                  : index > days.length - 5
                    ? "right-0"
                    : "left-1/2 -translate-x-1/2";
              return (
                <li
                  key={day.day}
                  className="group relative flex h-full flex-1 items-end justify-center"
                >
                  <span
                    className={cn(
                      "w-full max-w-6 rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-80",
                      day.revenue > 0 ? "min-h-1" : "h-0",
                    )}
                    style={{ height: `${height}%` }}
                  />
                  <span
                    role="tooltip"
                    className={cn(
                      "pointer-events-none absolute bottom-full z-10 mb-2 grid w-max gap-0.5 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100",
                      align,
                    )}
                  >
                    <span className="text-muted-foreground first-letter:uppercase">
                      {longDay.format(asDate(day.day))}
                    </span>
                    <span className="font-semibold tabular-nums">{formatCOP(day.revenue)}</span>
                    <span className="text-muted-foreground">
                      {day.orders} {day.orders === 1 ? "pedido" : "pedidos"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>

          {!hasSales && (
            <p className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
              Aún no hay ventas en este periodo.
            </p>
          )}
        </div>

        <div
          aria-hidden
          className="col-start-2 mt-2 flex gap-0.5 font-mono text-[0.7rem] text-muted-foreground"
        >
          {days.map((day, index) => (
            <span key={day.day} className="flex-1 text-center whitespace-nowrap">
              {(days.length - 1 - index) % labelEvery === 0 ? shortDay.format(asDate(day.day)) : ""}
            </span>
          ))}
        </div>
      </div>

      <details className="text-sm">
        <summary className="w-fit cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground">
          Ver como tabla
        </summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-lg border">
          <table className="w-full text-left text-xs [&_td]:px-3 [&_td]:py-1.5 [&_th]:px-3 [&_th]:py-1.5">
            <caption className="sr-only">Ventas por día</caption>
            <thead className="sticky top-0 bg-card">
              <tr>
                <th scope="col">Día</th>
                <th scope="col" className="text-right">
                  Pedidos
                </th>
                <th scope="col" className="text-right">
                  Ventas
                </th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((day) => (
                <tr key={day.day} className="border-t">
                  <td className="first-letter:uppercase">{longDay.format(asDate(day.day))}</td>
                  <td className="text-right tabular-nums">{day.orders}</td>
                  <td className="text-right tabular-nums">{formatCOP(day.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
