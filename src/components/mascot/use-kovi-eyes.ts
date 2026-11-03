"use client";

import { useEffect, type RefObject } from "react";

/** Gestos que Kovi hace (mascot.css: `.kovi[data-act=…]`) y cuánto duran. */
export const KOVI_ACTS = {
  look: 1800,
  wave: 1600,
  jump: 700,
  spin: 900,
  tilt: 1400,
  stretch: 1200,
  shake: 600,
  dance: 2000,
} as const;
export type KoviAct = keyof typeof KOVI_ACTS;

/** Los que hace solo cuando nadie lo toca (los más comunes, más veces). */
const IDLE_ACTS: KoviAct[] = ["look", "look", "wave", "tilt", "jump", "stretch", "spin", "dance"];

const motionOk = () => window.matchMedia("(prefers-reduced-motion: no-preference)").matches;

/** Hace que el Kovi que hay dentro de `box` haga un gesto (si no pide menos movimiento). */
export function playKovi(box: HTMLElement | null, act: KoviAct) {
  const svg = box?.querySelector<SVGSVGElement>("svg.kovi");
  if (!svg || !motionOk()) return;
  svg.removeAttribute("data-act");
  void svg.getBoundingClientRect();
  svg.setAttribute("data-act", act);
  window.clearTimeout(Number(svg.dataset.actTimer ?? 0));
  svg.dataset.actTimer = String(
    window.setTimeout(() => svg.removeAttribute("data-act"), KOVI_ACTS[act]),
  );
}

/**
 * Le da vida a Kovi: los ojos siguen al cursor, se inclina hacia él, parpadea
 * y, con `idle`, cada tanto hace solo un gesto (mira a los lados, saluda,
 * salta…). Solo con mouse para la mirada y nada con «reducir movimiento».
 */
export function useKoviEyes(
  box: RefObject<HTMLElement | null>,
  enabled = true,
  { idle = true }: { idle?: boolean } = {},
) {
  useEffect(() => {
    if (!enabled || !motionOk()) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const { clientX, clientY } = event;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const svg = box.current?.querySelector<SVGSVGElement>("svg.kovi");
        const eyes = svg?.querySelector<SVGGElement>(".kovi-eyes");
        if (!svg || !eyes) return;
        const rect = svg.getBoundingClientRect();
        const dx = clientX - (rect.left + rect.width / 2);
        const dy = clientY - (rect.top + rect.height * 0.4);
        const distance = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, distance / 260);
        eyes.style.transform = `translate(${((dx / distance) * 6 * reach).toFixed(1)}px, ${((dy / distance) * 4 * reach).toFixed(1)}px)`;
        // Se inclina un poco hacia el cursor (más cuanto más cerca está).
        const near = Math.max(0, 1 - distance / 700);
        svg.style.setProperty("--kovi-lean", `${((dx / distance) * 7 * near).toFixed(1)}deg`);
      });
    };
    const blink = window.setInterval(() => {
      const svg = box.current?.querySelector("svg.kovi");
      if (!svg || Math.random() < 0.4) return;
      svg.setAttribute("data-blink", "");
      window.setTimeout(() => svg.removeAttribute("data-blink"), 140);
    }, 2800);

    // Un gesto cada 7 a 14 segundos, si la pestaña está a la vista y no está dormido.
    let idleTimer = 0;
    const schedule = () => {
      idleTimer = window.setTimeout(
        () => {
          const svg = box.current?.querySelector("svg.kovi");
          if (!document.hidden && svg && svg.getAttribute("data-mood") !== "sleepy") {
            const act = IDLE_ACTS[Math.floor(Math.random() * IDLE_ACTS.length)] ?? "look";
            playKovi(box.current, act);
          }
          schedule();
        },
        7000 + Math.random() * 7000,
      );
    };
    if (idle) schedule();

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.clearInterval(blink);
      window.clearTimeout(idleTimer);
      cancelAnimationFrame(frame);
    };
  }, [box, enabled, idle]);
}
