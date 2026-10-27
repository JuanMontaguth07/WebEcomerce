"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Publica la posición del cursor (de -1 a 1) en las variables --px y --py para
 * que las capas `.parallax-layer` se desplacen según su `--depth`. El CSS solo
 * aplica el desplazamiento con cursor fino y sin movimiento reducido.
 */
export function PointerParallax({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    const { clientX, clientY } = event;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const node = ref.current;
      if (!node) return;
      const box = node.getBoundingClientRect();
      node.style.setProperty("--px", (((clientX - box.left) / box.width) * 2 - 1).toFixed(3));
      node.style.setProperty("--py", (((clientY - box.top) / box.height) * 2 - 1).toFixed(3));
    });
  }

  function reset() {
    cancelAnimationFrame(frame.current);
    ref.current?.style.setProperty("--px", "0");
    ref.current?.style.setProperty("--py", "0");
  }

  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={reset} className={cn(className)}>
      {children}
    </div>
  );
}
