"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

type Point = { x: number; y: number };

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/** Posición de cada hijo con `data-key`, relativa a la lista (no cambia al hacer scroll). */
function measure(list: HTMLElement): Map<string, Point> {
  const origin = list.getBoundingClientRect();
  const positions = new Map<string, Point>();
  for (const item of list.children) {
    const key = item instanceof HTMLElement ? item.dataset.key : undefined;
    if (!key) continue;
    const box = item.getBoundingClientRect();
    positions.set(key, { x: box.left - origin.left, y: box.top - origin.top });
  }
  return positions;
}

/**
 * Lista cuyos elementos se deslizan a su nueva posición cuando cambia el orden o
 * los filtros, y los que llegan aparecen suavemente (técnica FLIP con la Web
 * Animations API). Cada hijo directo necesita `data-key`. Sin animación con
 * movimiento reducido.
 */
export function ReorderList({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const positions = useRef<Map<string, Point>>(new Map());

  useLayoutEffect(() => {
    const list = ref.current;
    if (!list) return;
    const previous = positions.current;
    const next = measure(list);
    positions.current = next;
    // Primera vista: nada que animar.
    if (!previous.size || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let entering = 0;
    for (const item of list.children) {
      if (!(item instanceof HTMLElement) || !item.dataset.key) continue;
      const before = previous.get(item.dataset.key);
      const after = next.get(item.dataset.key);
      if (!after) continue;
      if (before) {
        const dx = before.x - after.x;
        const dy = before.y - after.y;
        if (dx || dy) {
          item.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0 0" }], {
            duration: 450,
            easing: EASE,
          });
        }
      } else {
        item.animate(
          [
            { opacity: 0, scale: "0.96" },
            { opacity: 1, scale: "1" },
          ],
          {
            duration: 380,
            easing: EASE,
            delay: Math.min(entering * 30, 240),
            fill: "backwards",
          },
        );
        entering += 1;
      }
    }
  });

  // Si cambia el ancho (columnas), la próxima comparación parte de la posición nueva.
  useEffect(() => {
    const list = ref.current;
    if (!list) return;
    const observer = new ResizeObserver(() => {
      positions.current = measure(list);
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  return (
    <ul ref={ref} className={className}>
      {children}
    </ul>
  );
}
