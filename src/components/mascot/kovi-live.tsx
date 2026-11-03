"use client";

import { useRef } from "react";
import type { MascotMood } from "@/features/mascot/store";
import { cn } from "@/lib/utils";
import { Kovi } from "./kovi";
import { useKoviEyes } from "./use-kovi-eyes";

/** Kovi que mira al cursor y parpadea, para los estados vacíos y su sección. */
export function KoviLive({ mood = "happy", className }: { mood?: MascotMood; className?: string }) {
  const box = useRef<HTMLSpanElement>(null);
  useKoviEyes(box);
  return (
    <span ref={box} data-mascot className={cn("block", className)}>
      <Kovi mood={mood} className="w-full" />
    </span>
  );
}
