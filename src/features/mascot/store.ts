import type { MascotTopic, Tip } from "./tips";

export type MascotMood = "happy" | "worried" | "thinking" | "sleepy" | "excited";

/** Algo que Kovi debe decir solo (p. ej. «algo no encaja» en Arma tu PC). */
export type MascotSignal = Tip & { mood: MascotMood; key: string };

type State = { topic: MascotTopic | null; signal: MascotSignal | null };

/**
 * Lo que las páginas le cuentan a Kovi: el tema de la página (una ficha de
 * gráfica, por ejemplo) y avisos del configurador. Un almacén mínimo para
 * useSyncExternalStore; en el servidor siempre está vacío.
 */
let state: State = { topic: null, signal: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export const mascotStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: () => state,
  getServer: () => EMPTY,
  setTopic(topic: MascotTopic | null) {
    if (state.topic === topic) return;
    state = { ...state, topic };
    emit();
  },
  /** Un aviso nuevo (otra `key`) hace que Kovi hable; el mismo no se repite. */
  signal(signal: MascotSignal | null) {
    if (state.signal?.key === signal?.key) return;
    state = { ...state, signal };
    emit();
  },
};

const EMPTY: State = { topic: null, signal: null };
