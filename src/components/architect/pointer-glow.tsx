"use client";

import { useEffect } from "react";

/**
 * Un solo oyente para toda la página: en los elementos `.glow-follow` publica
 * la posición del cursor (--mx, --my) para que su brillo lo siga. Solo con
 * mouse; en táctil el brillo no aparece.
 */
export function PointerGlow() {
  useEffect(() => {
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const target =
        event.target instanceof Element ? event.target.closest<HTMLElement>(".glow-follow") : null;
      if (!target) return;
      const { clientX, clientY } = event;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = target.getBoundingClientRect();
        target.style.setProperty("--mx", `${(clientX - box.left).toFixed(0)}px`);
        target.style.setProperty("--my", `${(clientY - box.top).toFixed(0)}px`);
      });
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
