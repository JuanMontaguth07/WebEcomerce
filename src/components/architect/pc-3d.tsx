"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type Pc3dChip = { title: string; text: string; className: string; depth: number };

/** Segundos sin mover el cursor antes de que el equipo vuelva a balancearse solo. */
const IDLE_MS = 2500;

/**
 * PC dibujado en 3D con CSS (sin imágenes ni librerías): gira siguiendo el
 * cursor o el dedo y, quieto, se balancea solo. Las fichas de alrededor se
 * desplazan según su profundidad. Con movimiento reducido queda quieto.
 */
export function Pc3d({ chips, className }: { chips: Pc3dChip[]; className?: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = stage.current;
    const pc = box.current;
    if (!node || !pc) return;
    const motion = window.matchMedia("(prefers-reduced-motion: no-preference)");
    let frame = 0;
    let idle = 0;

    const rest = () => {
      pc.style.removeProperty("--tilt-x");
      pc.style.removeProperty("--tilt-y");
      node.style.setProperty("--px", "0");
      node.style.setProperty("--py", "0");
      pc.setAttribute("data-idle", "");
    };
    const onMove = (event: PointerEvent) => {
      if (!motion.matches) return;
      const { clientX, clientY } = event;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = node.getBoundingClientRect();
        const x = (clientX - rect.left) / rect.width - 0.5;
        const y = (clientY - rect.top) / rect.height - 0.5;
        pc.removeAttribute("data-idle");
        // Siempre se ve el lado de vidrio: gira entre −60° y −16°.
        pc.style.setProperty("--tilt-y", `${(-38 + x * 44).toFixed(1)}deg`);
        pc.style.setProperty("--tilt-x", `${(-8 - y * 26).toFixed(1)}deg`);
        node.style.setProperty("--px", (x * 2).toFixed(3));
        node.style.setProperty("--py", (y * 2).toFixed(3));
      });
      window.clearTimeout(idle);
      idle = window.setTimeout(rest, IDLE_MS);
    };

    node.addEventListener("pointermove", onMove);
    return () => {
      node.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
      window.clearTimeout(idle);
    };
  }, []);

  return (
    <div
      ref={stage}
      className={cn("pc3d-stage relative grid h-[26rem] place-items-center", className)}
    >
      <div
        aria-hidden
        className="zone-breathe absolute aspect-square w-[70%] rounded-full bg-[radial-gradient(circle,var(--zone-glow),transparent_65%)] blur-xl"
      />
      <div ref={box} className="pc3d scale-[0.82] sm:scale-100" data-idle aria-hidden>
        <div className="pc3d-face pc3d-front">
          <div className="pc3d-fan" />
          <div className="pc3d-fan" />
          <div className="pc3d-fan" />
        </div>
        <div className="pc3d-face pc3d-back" />
        <div className="pc3d-face pc3d-glass">
          <div className="pc3d-board">
            <div className="pc3d-cpu" />
            <div className="pc3d-ram left-[98px]" />
            <div className="pc3d-ram left-[110px] [animation-delay:0.3s]" />
            <div className="pc3d-ram left-[122px] [animation-delay:0.6s]" />
          </div>
          <div className="pc3d-gpu" />
          <div className="pc3d-psu" />
          <div className="pc3d-strip" />
          <div className="pc3d-reflection" />
        </div>
        <div className="pc3d-face pc3d-left" />
        <div className="pc3d-face pc3d-top" />
        <div className="pc3d-face pc3d-bottom" />
      </div>
      {chips.map((chip) => (
        <div
          key={chip.title}
          style={{ "--depth": chip.depth } as React.CSSProperties}
          className={cn(
            "pc3d-chip absolute z-10 grid w-44 gap-0.5 rounded-xl border bg-card/80 px-3.5 py-3 text-xs shadow-raised backdrop-blur-md sm:w-48",
            "before:absolute before:-top-px before:left-3.5 before:h-[3px] before:w-6 before:rounded-full before:bg-[linear-gradient(90deg,var(--primary),var(--zone-2))] before:content-['']",
            chip.className,
          )}
        >
          <strong className="font-heading text-sm font-bold text-primary font-stretch-110%">
            {chip.title}
          </strong>
          <span className="text-muted-foreground">{chip.text}</span>
        </div>
      ))}
    </div>
  );
}
