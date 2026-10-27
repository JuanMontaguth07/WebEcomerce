import { cn } from "@/lib/utils";

/**
 * Fila que se desplaza sola (globals.css: .marquee). El contenido va dos veces
 * para que el giro no tenga corte; la copia queda fuera del teclado y de los
 * lectores de pantalla. Se pausa al pasar el cursor y se detiene con
 * movimiento reducido.
 */
export function Marquee({
  items,
  label,
  seconds = 45,
  reverse = false,
  className,
  itemClassName,
}: {
  items: { key: string; node: React.ReactNode }[];
  label: string;
  /** Duración de una vuelta completa. */
  seconds?: number;
  reverse?: boolean;
  className?: string;
  itemClassName?: string;
}) {
  if (!items.length) return null;
  return (
    <div
      className={cn("marquee", className)}
      data-reverse={reverse || undefined}
      style={{ "--marquee-duration": `${seconds}s` } as React.CSSProperties}
    >
      <ul aria-label={label} className="marquee-track py-1">
        {items.map((item) => (
          <li key={item.key} className={cn("shrink-0", itemClassName)}>
            {item.node}
          </li>
        ))}
        {items.map((item) => (
          <li
            key={`${item.key}-copia`}
            data-clone
            aria-hidden
            inert
            className={cn("shrink-0", itemClassName)}
          >
            {item.node}
          </li>
        ))}
      </ul>
    </div>
  );
}
