"use client";

import { usePathname } from "next/navigation";
import { moduleFor } from "./admin-nav";
import type { TileTone } from "./module-tile";

/** El color de cada módulo, para las luces del fondo («accent» usa el del admin). */
const TONE_COLORS: Record<TileTone, string> = {
  green: "#4ade80",
  blue: "#60a5fa",
  amber: "#fbbf24",
  red: "#fb7185",
  violet: "#a78bfa",
  pink: "#f472b6",
  teal: "#2dd4bf",
  orange: "#fb923c",
  sky: "#38bdf8",
  indigo: "#818cf8",
  cyan: "#22d3ee",
  slate: "#94a3b8",
  accent: "var(--primary)",
};

/**
 * Fondo vivo del panel: tres luces muy difuminadas que se mueven despacio. Una
 * toma el color de tu acento y las otras el del módulo donde estás (verde en
 * Pedidos, azul en Productos…), así que el fondo cambia al moverte por el
 * panel. Quieto con «reducir movimiento». Detrás de todo y sin recibir clics.
 */
export function AdminBackdrop() {
  const pathname = usePathname();
  const tone = moduleFor(pathname)?.tone ?? "indigo";
  const color = TONE_COLORS[tone];
  return (
    <div
      aria-hidden
      className="admin-backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ "--module": color } as React.CSSProperties}
    >
      <span className="admin-blob admin-blob-a" />
      <span className="admin-blob admin-blob-b" />
      <span className="admin-blob admin-blob-c" />
      <span className="admin-grain" />
    </div>
  );
}
