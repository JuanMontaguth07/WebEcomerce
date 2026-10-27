"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";

const loadMotionFeatures = () => import("./motion-features").then((mod) => mod.default);

/**
 * Proveedores globales del cliente.
 * - Tema: claro / oscuro / sistema, guardado en localStorage y aplicado antes
 *   de pintar (sin parpadeo).
 * - Movimiento: usar `m.*` de "motion/react" (no `motion.*`); respeta
 *   prefers-reduced-motion automáticamente.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      storageKey="theme"
    >
      <LazyMotion features={loadMotionFeatures} strict>
        <MotionConfig reducedMotion="user">
          {children}
          <Toaster />
        </MotionConfig>
      </LazyMotion>
    </ThemeProvider>
  );
}
