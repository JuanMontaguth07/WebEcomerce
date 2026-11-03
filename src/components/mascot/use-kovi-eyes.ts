"use client";

import { useEffect, type RefObject } from "react";

/**
 * Los ojos de Kovi siguen al cursor y parpadean de vez en cuando. `box` es el
 * elemento que contiene su SVG. Solo con mouse y sin «reducir movimiento».
 */
export function useKoviEyes(box: RefObject<HTMLElement | null>, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const { clientX, clientY } = event;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const svg = box.current?.querySelector("svg.kovi");
        const eyes = svg?.querySelector<SVGGElement>(".kovi-eyes");
        if (!svg || !eyes) return;
        const rect = svg.getBoundingClientRect();
        const dx = clientX - (rect.left + rect.width / 2);
        const dy = clientY - (rect.top + rect.height * 0.4);
        const distance = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, distance / 260);
        eyes.style.transform = `translate(${((dx / distance) * 6 * reach).toFixed(1)}px, ${((dy / distance) * 4 * reach).toFixed(1)}px)`;
      });
    };
    const blink = window.setInterval(() => {
      const svg = box.current?.querySelector("svg.kovi");
      if (!svg || Math.random() < 0.4) return;
      svg.setAttribute("data-blink", "");
      window.setTimeout(() => svg.removeAttribute("data-blink"), 140);
    }, 2800);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.clearInterval(blink);
      cancelAnimationFrame(frame);
    };
  }, [box, enabled]);
}
