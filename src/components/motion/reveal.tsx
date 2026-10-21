"use client";

import { m, type HTMLMotionProps } from "motion/react";

type RevealProps = HTMLMotionProps<"div"> & {
  /** Retraso en segundos, útil para escalonar elementos de una lista. */
  delay?: number;
};

/**
 * Aparición progresiva al entrar en pantalla.
 * No usar en contenido visible al cargar (hero, imagen principal): retrasaría el LCP.
 */
export function Reveal({ delay = 0, children, ...props }: RevealProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.45, delay, ease: [0.2, 0.7, 0.2, 1] }}
      {...props}
    >
      {children}
    </m.div>
  );
}
