"use client";

import { XIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { mascotStore, type MascotMood } from "@/features/mascot/store";
import { tipsFor, topicFromPath, type Tip } from "@/features/mascot/tips";
import { cn } from "@/lib/utils";
import { Kovi } from "./kovi";
import { useKoviEyes } from "./use-kovi-eyes";

const HIDDEN_KEY = "kova-kovi";
const HELLO_KEY = "kova-kovi-hola";
/** Ya se presentó en este navegador: desde entonces solo saluda con un consejo. */
const INTRO_KEY = "kova-kovi-conocido";

const INTRO: Tip = {
  title: "¡Hola! Soy Kovi",
  text: "El asistente de Kova. Tócame cuando quieras un consejo; en Arma tu PC te digo al momento si las piezas encajan.",
};
/** Aparece un momento después de cargar, para no competir con lo principal. */
const ENTER_MS = 1200;
const HELLO_MS = 2200;
const BUBBLE_MS = 8000;

/** `auto`: lo dijo solo (saludo o aviso) y se cierra al rato; si lo pidieron, se queda. */
type Bubble = Tip & { mood: MascotMood; auto: boolean };

const read = (storage: () => Storage, key: string) => {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
};
const write = (storage: () => Storage, key: string, value: string | null) => {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, value);
  } catch {
    // Sin almacenamiento (modo privado): no se recuerda, pero funciona igual.
  }
};

/**
 * Kovi, la mascota: flota en una esquina, sigue el cursor con la mirada, da un
 * consejo de la página al tocarlo y saluda una sola vez por visita. En Arma tu
 * PC reacciona a la compatibilidad del equipo (mascotStore.signal). Se puede
 * esconder: queda asomado en el borde y vuelve con un toque.
 */
export function Mascot() {
  const pathname = usePathname();
  const { topic: pageTopic, signal } = useSyncExternalStore(
    mascotStore.subscribe,
    mascotStore.get,
    mascotStore.getServer,
  );
  const topic = pageTopic ?? topicFromPath(pathname);
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);
  // Hasta que lo tocan por primera vez, un anillo invita a conocerlo.
  const [introduced, setIntroduced] = useState(true);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [mood, setMood] = useState<MascotMood>("happy");
  const next = useRef(0);
  const svgBox = useRef<HTMLSpanElement>(null);

  const show = (value: Bubble) => {
    setBubble(value);
    setMood(value.mood);
  };

  // Al cambiar de página se calla.
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setBubble(null);
    setMood("happy");
  }

  // Avisos de la página (Arma tu PC): hablan solos, salvo si está escondido.
  const [seenSignal, setSeenSignal] = useState(signal?.key);
  if (seenSignal !== signal?.key) {
    setSeenSignal(signal?.key);
    if (signal) {
      setMood(signal.mood);
      if (ready && !hidden) setBubble({ ...signal, auto: true });
    }
  }

  // Cada mensaje nuevo: un saltito y, si es automático, se cierra solo.
  useEffect(() => {
    if (!bubble) return;
    const svg = svgBox.current?.querySelector("svg");
    if (svg) {
      svg.removeAttribute("data-hop");
      void svg.getBoundingClientRect();
      svg.setAttribute("data-hop", "");
    }
    if (!bubble.auto) return;
    const timer = window.setTimeout(() => setBubble(null), BUBBLE_MS);
    return () => window.clearTimeout(timer);
  }, [bubble]);

  // Entra después de cargar; recuerda si estaba escondido.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHidden(read(() => localStorage, HIDDEN_KEY) === "min");
      setIntroduced(read(() => localStorage, INTRO_KEY) === "1");
      setReady(true);
    }, ENTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  // Saludo: una vez por visita, con el primer consejo de la página (no en el pago).
  useEffect(() => {
    if (!ready || hidden || topic === "checkout" || topic === "order") return;
    const firstTime = read(() => localStorage, INTRO_KEY) !== "1";
    if (!firstTime && read(() => sessionStorage, HELLO_KEY)) return;
    const timer = window.setTimeout(() => {
      write(() => sessionStorage, HELLO_KEY, "1");
      // La primera vez se presenta y espera a que lo cierren.
      if (firstTime) {
        show({ ...INTRO, mood: "happy", auto: false });
        return;
      }
      const [first] = tipsFor(topic);
      if (!first) return;
      // «Otro consejo» sigue con el siguiente.
      next.current = 1;
      show({ ...first, mood: "happy", auto: true });
    }, HELLO_MS);
    return () => window.clearTimeout(timer);
    // Solo al aparecer: cambiar de tema después no vuelve a saludar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, hidden]);

  // Mirada que sigue al cursor y parpadeo.
  useKoviEyes(svgBox, ready && !hidden);

  if (!ready) return null;

  function meet() {
    if (introduced) return;
    setIntroduced(true);
    write(() => localStorage, INTRO_KEY, "1");
  }

  function giveTip() {
    meet();
    const tips = tipsFor(topic);
    const tip = tips[next.current % tips.length];
    next.current += 1;
    if (tip) show({ ...tip, mood: "happy", auto: false });
  }

  function hide() {
    meet();
    setBubble(null);
    setHidden(true);
    write(() => localStorage, HIDDEN_KEY, "min");
  }

  function bringBack() {
    setHidden(false);
    write(() => localStorage, HIDDEN_KEY, null);
    giveTip();
  }

  if (hidden) {
    return (
      <div data-mascot className="mascot-dock fixed !left-0 z-30">
        <button
          type="button"
          onClick={bringBack}
          aria-label="Mostrar a Kovi, la mascota"
          title="Mostrar a Kovi"
          className="block w-12 -translate-x-1/3 rounded-r-2xl opacity-80 transition-[translate,opacity] duration-300 ease-out-soft outline-none hover:translate-x-0 hover:opacity-100 focus-visible:translate-x-0 focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <Kovi mood="happy" className="w-full [animation:none]" />
        </button>
      </div>
    );
  }

  return (
    <div data-mascot className="mascot-dock mascot-in fixed z-30 grid justify-items-start gap-2">
      <div role="status" aria-live="polite" className="contents">
        {bubble && (
          <div
            key={`${bubble.title}-${bubble.text}`}
            className="mascot-bubble-in relative w-[min(18rem,calc(100vw-2rem))] rounded-2xl border bg-card p-3 pr-8 text-sm shadow-raised"
          >
            <p className="font-mono text-[0.6875rem] font-semibold tracking-wide text-primary">
              Kovi · {bubble.title}
            </p>
            <p className="mt-0.5 leading-snug">{bubble.text}</p>
            <div className="mt-2 flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={giveTip}
                className="font-semibold text-primary hover:underline"
              >
                Otro consejo
              </button>
              <button
                type="button"
                onClick={hide}
                className="text-muted-foreground hover:text-foreground hover:underline"
              >
                Esconder a Kovi
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                meet();
                setBubble(null);
              }}
              aria-label="Cerrar el consejo"
              className="absolute top-2 right-2 grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <XIcon className="size-3.5" aria-hidden />
            </button>
            <span
              aria-hidden
              className="absolute -bottom-1.5 left-8 size-3 rotate-45 border-r border-b bg-card"
            />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          meet();
          if (bubble) setBubble(null);
          else giveTip();
        }}
        aria-label={bubble ? "Cerrar el consejo de Kovi" : "Kovi, la mascota: toca para un consejo"}
        aria-expanded={Boolean(bubble)}
        className="relative rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        {!introduced && (
          <span
            aria-hidden
            className="kovi-ring pointer-events-none absolute inset-x-1 bottom-1 aspect-square rounded-full"
          />
        )}
        <span ref={svgBox} className={cn("relative block w-16 sm:w-20")}>
          <Kovi mood={mood} className="w-full" />
        </span>
      </button>
    </div>
  );
}
