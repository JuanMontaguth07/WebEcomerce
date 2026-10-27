"use client";

import { useSyncExternalStore } from "react";
import { SHARE_CODE } from "./saved";

/**
 * «Mis configuraciones»: las que se guardaron desde este navegador. Sin cuentas
 * de cliente, la lista vive en localStorage (y se dice así en pantalla); cada
 * configuración se abre con su enlace desde cualquier lugar.
 */
export type SavedEntry = { code: string; name: string; total: number; savedAt: string };

const STORAGE_KEY = "architect:builds:v1";
const MAX_ENTRIES = 30;
const EMPTY: SavedEntry[] = [];
const listeners = new Set<() => void>();
let snapshot: SavedEntry[] | null = null;

function sanitize(value: unknown): SavedEntry[] {
  if (!Array.isArray(value)) return EMPTY;
  return value
    .filter(
      (item): item is SavedEntry =>
        typeof item === "object" &&
        item !== null &&
        typeof item.code === "string" &&
        SHARE_CODE.test(item.code) &&
        typeof item.name === "string" &&
        typeof item.total === "number" &&
        typeof item.savedAt === "string",
    )
    .slice(0, MAX_ENTRIES);
}

function read(): SavedEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function write(entries: SavedEntry[]) {
  snapshot = entries;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Almacenamiento bloqueado (modo privado): la lista vive solo en memoria.
  }
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return;
  snapshot = read();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => (snapshot ??= read());
const getServerSnapshot = () => EMPTY;

export const savedBuildsActions = {
  /** La más reciente primero; un mismo código no se repite. */
  add: (entry: SavedEntry) =>
    write(
      [entry, ...getSnapshot().filter((item) => item.code !== entry.code)].slice(0, MAX_ENTRIES),
    ),
  remove: (code: string) => write(getSnapshot().filter((item) => item.code !== code)),
};

export function useSavedBuilds() {
  const entries = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { entries, ...savedBuildsActions };
}
