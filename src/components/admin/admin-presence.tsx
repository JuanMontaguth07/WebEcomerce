"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { createContext, use, useEffect, useState, useSyncExternalStore } from "react";
import {
  formatLastSeen,
  mergePresence,
  PRESENCE_CHANNEL,
  type OnlineAdmin,
  type PresenceMeta,
  type PresenceStatus,
} from "@/features/account/presence";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/** Sin tocar el teclado ni el mouse durante este tiempo, el admin pasa a «ausente». */
const AWAY_AFTER_MS = 5 * 60_000;
/** Cada cuánto se guarda la «última vez visto» mientras la pestaña está activa. */
const HEARTBEAT_MS = 2 * 60_000;
/** Espera antes de volver a entrar al canal si Realtime lo rechazó. */
const RETRY_MS = 30_000;
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

type PresenceValue = {
  selfId: string;
  online: Record<string, OnlineAdmin>;
  /** Hora en que cada admin cerró su última pestaña durante esta visita. */
  leftAt: Record<string, string>;
};

const PresenceContext = createContext<PresenceValue | null>(null);

export function usePresence(): PresenceValue {
  const value = use(PresenceContext);
  if (!value) throw new Error("usePresence necesita AdminPresenceProvider");
  return value;
}

/**
 * Anuncia al admin en el canal privado de presencia y escucha a los demás.
 * Realtime solo deja entrar a administradores (políticas sobre realtime.messages).
 */
export function AdminPresenceProvider({
  self,
  children,
}: {
  self: { id: string; name: string; initials: string };
  children: React.ReactNode;
}) {
  const [online, setOnline] = useState<Record<string, OnlineAdmin>>({});
  const [leftAt, setLeftAt] = useState<Record<string, string>>({});
  const { id, name, initials } = self;

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    let status: PresenceStatus = document.visibilityState === "visible" ? "online" : "away";
    let idleTimer: number | undefined;
    let lastActivity = 0;

    const track = () => {
      const meta: PresenceMeta = { name, initials, status };
      void channel?.track(meta);
    };
    const setStatus = (next: PresenceStatus) => {
      if (next === status) return;
      status = next;
      track();
    };
    const touch = () => {
      if (document.visibilityState === "visible") void supabase.rpc("touch_admin_seen");
    };
    const markActive = () => {
      // Basta con reiniciar el contador cada pocos segundos.
      if (Date.now() - lastActivity < 10_000 && status === "online") return;
      lastActivity = Date.now();
      window.clearTimeout(idleTimer);
      setStatus("online");
      idleTimer = window.setTimeout(() => setStatus("away"), AWAY_AFTER_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        markActive();
        touch();
      } else {
        setStatus("away");
      }
    };

    let retry: number | undefined;
    const join = async () => {
      // El canal privado necesita el token de la sesión antes de suscribirse.
      await supabase.realtime.setAuth();
      if (cancelled) return;
      const joined = supabase.channel(PRESENCE_CHANNEL, {
        config: { private: true, presence: { key: id } },
      });
      channel = joined;
      joined
        .on("presence", { event: "sync" }, () => {
          const state = joined.presenceState<PresenceMeta>();
          const next: Record<string, OnlineAdmin> = {};
          for (const [key, metas] of Object.entries(state)) {
            const admin = mergePresence(key, metas);
            if (admin) next[key] = admin;
          }
          setOnline(next);
        })
        .on("presence", { event: "leave" }, ({ key }) => {
          setLeftAt((current) => ({ ...current, [key]: new Date().toISOString() }));
        })
        .subscribe((state) => {
          if (state === "SUBSCRIBED") track();
          // Realtime puede rechazar la primera conexión del día mientras prepara
          // su almacenamiento: se cierra el canal y se reintenta con calma.
          if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") {
            channel = null;
            setOnline({});
            void supabase.removeChannel(joined);
            window.clearTimeout(retry);
            if (!cancelled) retry = window.setTimeout(() => void join(), RETRY_MS);
          }
        });
    };
    void join();

    markActive();
    touch();
    const heartbeat = window.setInterval(touch, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", onVisibility);
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, markActive, { passive: true });
    }

    return () => {
      cancelled = true;
      window.clearInterval(heartbeat);
      window.clearTimeout(idleTimer);
      window.clearTimeout(retry);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, markActive);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [id, name, initials]);

  return <PresenceContext value={{ selfId: id, online, leftAt }}>{children}</PresenceContext>;
}

const STATUS_LABEL: Record<PresenceStatus, string> = { online: "En línea", away: "Ausente" };

/** Punto verde (en línea) o ámbar (ausente) sobre un avatar; nada si no está. */
export function PresenceDot({ userId, className }: { userId: string; className?: string }) {
  const admin = usePresence().online[userId];
  if (!admin) return null;
  return (
    <span
      className={cn(
        "absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-card",
        admin.status === "online" ? "bg-success" : "bg-warning",
        className,
      )}
    >
      <span className="sr-only">{STATUS_LABEL[admin.status]}</span>
    </span>
  );
}

/** Los otros administradores conectados, como avatares en el encabezado del panel. */
export function OnlineAdmins() {
  const { online, selfId } = usePresence();
  const others = Object.values(online).filter((admin) => admin.id !== selfId);
  if (!others.length) return null;

  const summary = others
    .map((admin) => `${admin.name}: ${STATUS_LABEL[admin.status].toLowerCase()}`)
    .join(", ");
  return (
    <div className="hidden items-center gap-2 sm:flex" title={summary}>
      <ul aria-label="Administradores conectados" className="flex -space-x-2">
        {others.slice(0, 3).map((admin) => (
          <li
            key={admin.id}
            className="relative grid size-8 place-items-center rounded-full bg-secondary text-xs font-semibold ring-2 ring-card"
          >
            <span aria-hidden>{admin.initials}</span>
            <span className="sr-only">{admin.name}</span>
            <PresenceDot userId={admin.id} className="size-2.5" />
          </li>
        ))}
      </ul>
      <span className="hidden text-xs text-muted-foreground md:inline">
        {others.length === 1 ? `${others[0]?.name} está conectado` : `${others.length} conectados`}
      </span>
    </div>
  );
}

// Reloj compartido que avanza cada 30 s, para el «Visto hace…».
let clock = 0;
const clockListeners = new Set<() => void>();
let clockTimer: number | undefined;

function subscribeClock(listener: () => void) {
  clockListeners.add(listener);
  if (clockListeners.size === 1) {
    clockTimer = window.setInterval(() => {
      clock = Date.now();
      clockListeners.forEach((notify) => notify());
    }, 30_000);
  }
  return () => {
    clockListeners.delete(listener);
    if (!clockListeners.size) window.clearInterval(clockTimer);
  };
}

function getClock() {
  if (!clock) clock = Date.now();
  return clock;
}

/** «En línea», «Ausente» o «Visto hace…» de un admin (lista de Mi cuenta). */
export function AdminStatus({ userId, lastSeen }: { userId: string; lastSeen: string | null }) {
  const { online, leftAt } = usePresence();
  // En el servidor no hay hora de referencia: el texto relativo aparece al hidratar.
  const now = useSyncExternalStore(subscribeClock, getClock, () => null);
  const admin = online[userId];

  if (admin) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium">
        <span
          aria-hidden
          className={cn(
            "size-2 rounded-full",
            admin.status === "online" ? "bg-success" : "bg-warning",
          )}
        />
        {STATUS_LABEL[admin.status]}
      </span>
    );
  }

  const seen = [leftAt[userId], lastSeen].filter(Boolean).sort().at(-1);
  if (!seen || now === null) return null;
  return <span className="text-xs text-muted-foreground">{formatLastSeen(seen, now)}</span>;
}
