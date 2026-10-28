"use client";

import { XIcon } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { timeAgo } from "@/features/admin-live/format";
import { ALERT_META, type LiveAlert } from "@/features/admin-live/types";
import { cn } from "@/lib/utils";
import { AppIcon } from "./app-icon";
import { TOAST_MS, useLive } from "./live-provider";
import { useNow } from "./use-now";

const GAP = 10;
/** Cuánto asoma cada notificación de atrás cuando están apiladas. */
const PEEK = 11;
/** Distancia para descartar al deslizar hacia la derecha. */
const SWIPE = 90;

/**
 * Notificaciones flotantes al estilo iOS: vidrio esmerilado, ícono de color y
 * pila que se despliega al pasar el cursor. Se descartan deslizándolas o con la
 * X, y se van solas tras unos segundos (la cuenta se pausa con el cursor encima).
 */
export function LiveToasts() {
  const { toasts, dismissToast, setChatOpen } = useLive();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const now = useNow();

  const offsets = toasts.map((toast, index) => {
    if (!expanded) return index * PEEK;
    return toasts.slice(0, index).reduce((sum, item) => sum + (heights[item.id] ?? 76) + GAP, 0);
  });
  const total = expanded
    ? (offsets.at(-1) ?? 0) + (heights[toasts.at(-1)?.id ?? ""] ?? 76)
    : (heights[toasts[0]?.id ?? ""] ?? 76) + Math.max(0, toasts.length - 1) * PEEK;

  const open = (toast: LiveAlert) => {
    dismissToast(toast.id);
    if (toast.kind === "chat") setChatOpen(true);
    else if (toast.href) router.push(toast.href as Route);
  };

  return (
    <section
      aria-label="Notificaciones"
      aria-live="polite"
      onPointerEnter={() => setExpanded(true)}
      onPointerLeave={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setExpanded(false);
      }}
      className="pointer-events-none fixed top-[max(4.75rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-[60] w-[min(23rem,calc(100vw-2rem))]"
      style={{ height: toasts.length ? total : 0 }}
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast, index) => (
          <m.div
            key={toast.id}
            className="pointer-events-auto absolute inset-x-0 top-0 origin-top"
            style={{ zIndex: toasts.length - index }}
            initial={{ opacity: 0, y: -24, scale: 0.94 }}
            animate={{
              opacity: !expanded && index > 2 ? 0 : 1,
              y: offsets[index],
              scale: expanded ? 1 : 1 - index * 0.045,
            }}
            exit={{ opacity: 0, x: 120, transition: { duration: 0.25 } }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <Toast
              toast={toast}
              now={now}
              paused={expanded}
              // De atrás solo se ve el borde: no deben recibir clics ni foco.
              hidden={!expanded && index > 0}
              onMeasure={(height) =>
                setHeights((current) =>
                  current[toast.id] === height ? current : { ...current, [toast.id]: height },
                )
              }
              onOpen={() => open(toast)}
              onDismiss={() => dismissToast(toast.id)}
            />
          </m.div>
        ))}
      </AnimatePresence>
    </section>
  );
}

function Toast({
  toast,
  now,
  paused,
  hidden,
  onMeasure,
  onOpen,
  onDismiss,
}: {
  toast: LiveAlert;
  now: number | null;
  paused: boolean;
  hidden: boolean;
  onMeasure: (height: number) => void;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);
  // Si el gesto fue un deslizamiento, el clic que el navegador dispara después no abre nada.
  const swiped = useRef(false);
  const remaining = useRef(TOAST_MS);
  // Las funciones cambian en cada render del padre; los efectos usan la última.
  const callbacks = useRef({ onMeasure, onDismiss });
  useLayoutEffect(() => {
    callbacks.current = { onMeasure, onDismiss };
  });

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(() => callbacks.current.onMeasure(node.offsetHeight));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Se va sola; con el cursor encima la cuenta se detiene y luego sigue.
  useEffect(() => {
    if (paused) return;
    const began = Date.now();
    const timer = window.setTimeout(() => callbacks.current.onDismiss(), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(1200, remaining.current - (Date.now() - began));
    };
  }, [paused]);

  const meta = ALERT_META[toast.kind];

  return (
    <div
      ref={ref}
      inert={hidden}
      aria-hidden={hidden || undefined}
      onPointerDown={(event) => {
        start.current = event.clientX;
        swiped.current = false;
      }}
      onPointerMove={(event) => {
        if (start.current === null) return;
        const distance = Math.max(0, event.clientX - start.current);
        if (distance > 6) swiped.current = true;
        setDrag(distance);
      }}
      onPointerUp={() => {
        if (drag > SWIPE) onDismiss();
        start.current = null;
        setDrag(0);
      }}
      onPointerCancel={() => {
        start.current = null;
        setDrag(0);
      }}
      style={{ translate: `${drag}px 0`, opacity: 1 - Math.min(drag / 240, 0.6) }}
      className={cn(
        "group relative grid touch-pan-y grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-[1.35rem] border border-white/10 bg-popover/75 p-3 pr-9 text-popover-foreground shadow-[0_18px_50px_-18px_rgb(0_0_0/0.55)] backdrop-blur-2xl backdrop-saturate-150",
        drag === 0 && "transition-[translate,opacity] duration-300 ease-out-soft",
      )}
    >
      <AppIcon kind={toast.kind} />
      <button
        type="button"
        onClick={() => {
          if (swiped.current) {
            swiped.current = false;
            return;
          }
          onOpen();
        }}
        className="grid min-w-0 gap-0.5 text-left outline-none focus-visible:underline"
      >
        <span className="flex items-baseline justify-between gap-2 text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
          {meta.app}
          {now !== null && (
            <span className="shrink-0 tracking-normal normal-case">
              {timeAgo(toast.createdAt, now)}
            </span>
          )}
        </span>
        <span className="truncate text-sm font-semibold">{toast.title}</span>
        {toast.body && (
          <span className="line-clamp-2 text-[0.8125rem] leading-snug text-muted-foreground">
            {toast.body}
          </span>
        )}
      </button>
      <button
        type="button"
        aria-label="Descartar notificación"
        onClick={onDismiss}
        className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-foreground/10 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100"
      >
        <XIcon className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
