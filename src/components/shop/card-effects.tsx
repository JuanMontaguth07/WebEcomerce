"use client";

import { useEffect } from "react";

/** Grados máximos de giro de una tarjeta al pasar el cursor por su borde. */
const MAX_TILT = 7;

/**
 * Efectos de las tarjetas de producto con un solo componente para toda la página,
 * sin hidratar cada tarjeta:
 *   · Giro 3D y reflejo que siguen al cursor en `[data-tilt]` (solo mouse y sin
 *     movimiento reducido): publica --rx, --ry, --gx y --gy en la tarjeta.
 *   · Pausa las animaciones de rareza de las tarjetas fuera de pantalla
 *     (`data-offscreen`), para que una grilla larga no gaste batería.
 */
export function CardEffects() {
  useEffect(() => {
    const canTilt = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    let active: HTMLElement | null = null;
    let frame = 0;

    const reset = (card: HTMLElement) => {
      for (const name of ["--rx", "--ry", "--gx", "--gy"]) card.style.removeProperty(name);
    };
    const release = () => {
      cancelAnimationFrame(frame);
      if (active) reset(active);
      active = null;
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !canTilt.matches) return;
      const card =
        event.target instanceof Element ? event.target.closest<HTMLElement>("[data-tilt]") : null;
      if (card !== active) release();
      if (!card) return;
      active = card;
      const { clientX, clientY } = event;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = card.getBoundingClientRect();
        const x = (clientX - box.left) / box.width;
        const y = (clientY - box.top) / box.height;
        card.style.setProperty("--ry", `${((x - 0.5) * 2 * MAX_TILT).toFixed(2)}deg`);
        card.style.setProperty("--rx", `${((0.5 - y) * 2 * MAX_TILT).toFixed(2)}deg`);
        card.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
        card.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
      });
    };
    // Al salir de la ventana no llega otro pointermove: se suelta la tarjeta aquí.
    const onOut = (event: PointerEvent) => {
      if (!event.relatedTarget) release();
    };

    const observed = new Set<Element>();
    const visibility = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.toggleAttribute("data-offscreen", !entry.isIntersecting);
        }
      },
      { rootMargin: "120px" },
    );
    let scanFrame = 0;
    const scan = () => {
      cancelAnimationFrame(scanFrame);
      scanFrame = requestAnimationFrame(() => {
        for (const card of observed) {
          if (card.isConnected) continue;
          visibility.unobserve(card);
          observed.delete(card);
        }
        for (const card of document.querySelectorAll(".rarity-card")) {
          if (observed.has(card)) continue;
          observed.add(card);
          visibility.observe(card);
        }
      });
    };
    // Las grillas cambian al filtrar o navegar sin recargar la página.
    const changes = new MutationObserver(scan);
    changes.observe(document.body, { childList: true, subtree: true });
    scan();

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onOut);
    return () => {
      release();
      cancelAnimationFrame(scanFrame);
      changes.disconnect();
      visibility.disconnect();
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
    };
  }, []);

  return null;
}
