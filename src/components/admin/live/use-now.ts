"use client";

import { useSyncExternalStore } from "react";

// Reloj compartido que avanza cada 30 s, para los «hace 2 min» del panel.
let now = 0;
const listeners = new Set<() => void>();
let timer: number | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    timer = window.setInterval(() => {
      now = Date.now();
      listeners.forEach((notify) => notify());
    }, 30_000);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.clearInterval(timer);
  };
}

function getSnapshot() {
  if (!now) now = Date.now();
  return now;
}

/** Hora actual que se renueva cada 30 s; null en el servidor (se pinta al hidratar). */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
