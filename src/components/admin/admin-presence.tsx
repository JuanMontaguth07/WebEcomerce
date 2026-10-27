"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { SmartphoneIcon, UsersIcon } from "lucide-react";
import { Popover } from "radix-ui";
import { createContext, use, useEffect, useState, useSyncExternalStore } from "react";
import {
  detectDevice,
  formatLastSeen,
  mergePresence,
  presenceLabel,
  PRESENCE_CHANNEL,
  STATUS_LABEL,
  type OnlineAdmin,
  type PresenceMeta,
  type PresenceStatus,
} from "@/features/account/presence";
import type { TeamMember } from "@/features/account/team";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/** Sin tocar el teclado ni el mouse durante este tiempo, el admin pasa a «ausente». */
const AWAY_AFTER_MS = 5 * 60_000;
/** Cada cuánto se guarda la «última vez visto» mientras la pestaña está activa. */
const HEARTBEAT_MS = 2 * 60_000;
/** Espera antes de volver a entrar al canal si Realtime lo rechazó. */
const RETRY_MS = 30_000;
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

/** Estado del canal en vivo: si no está conectado, los estados pueden estar desactualizados. */
type Connection = "connecting" | "live" | "retrying";

type PresenceValue = {
  selfId: string;
  team: TeamMember[];
  online: Record<string, OnlineAdmin>;
  /** Hora en que cada admin cerró su última pestaña durante esta visita. */
  leftAt: Record<string, string>;
  connection: Connection;
};

const PresenceContext = createContext<PresenceValue | null>(null);

export function usePresence(): PresenceValue {
  const value = use(PresenceContext);
  if (!value) throw new Error("usePresence necesita AdminPresenceProvider");
  return value;
}

/**
 * Anuncia al admin en el canal privado de presencia (estado y dispositivo) y
 * escucha a los demás. Realtime solo deja entrar a administradores (políticas
 * sobre realtime.messages).
 */
export function AdminPresenceProvider({
  self,
  team,
  children,
}: {
  self: { id: string; name: string; initials: string };
  team: TeamMember[];
  children: React.ReactNode;
}) {
  const [online, setOnline] = useState<Record<string, OnlineAdmin>>({});
  const [leftAt, setLeftAt] = useState<Record<string, string>>({});
  const [connection, setConnection] = useState<Connection>("connecting");
  const { id, name, initials } = self;

  useEffect(() => {
    const supabase = createClient();
    const device = detectDevice(window.navigator);
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    let status: PresenceStatus = document.visibilityState === "visible" ? "online" : "away";
    let idleTimer: number | undefined;
    let retry: number | undefined;
    let lastActivity = 0;

    const track = () => {
      const meta: PresenceMeta = { name, initials, status, device };
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
        .subscribe((state, error) => {
          // Al reconectarse (p. ej. al volver a la pestaña) se anuncia de nuevo.
          if (state === "SUBSCRIBED") {
            setConnection("live");
            track();
          }
          // Realtime puede rechazar la primera conexión del día mientras prepara
          // su almacenamiento: se cierra el canal y se reintenta con calma.
          if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") {
            console.warn("[presencia] canal no disponible", state, error?.message);
            channel = null;
            setOnline({});
            setConnection("retrying");
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

  return (
    <PresenceContext value={{ selfId: id, team, online, leftAt, connection }}>
      {children}
    </PresenceContext>
  );
}

/**
 * Indicador sobre el avatar, como en Discord: punto verde (en línea), luna ámbar
 * (ausente), celular verde o ámbar (solo desde el celular) y aro gris (desconectado).
 */
export function PresenceDot({ userId, className }: { userId: string; className?: string }) {
  const admin = usePresence().online[userId];
  const label = presenceLabel(admin);
  const ring = "ring-2 ring-[color:var(--presence-ring,var(--card))]";

  if (admin?.device === "mobile") {
    return (
      <span
        className={cn(
          "absolute -right-1 -bottom-1 grid h-4 w-3 place-items-center rounded-[0.2rem] bg-[color:var(--presence-ring,var(--card))]",
          admin.status === "online" ? "text-success" : "text-warning",
          className,
        )}
        title={label}
      >
        <SmartphoneIcon className="size-3.5" strokeWidth={2.75} aria-hidden />
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  return (
    <span
      title={label}
      className={cn(
        "absolute -right-0.5 -bottom-0.5 size-3 rounded-full",
        ring,
        !admin &&
          "border-[2.5px] border-muted-foreground bg-[color:var(--presence-ring,var(--card))]",
        admin?.status === "online" && "bg-success",
        // Luna: un círculo ámbar al que le falta un mordisco arriba a la izquierda.
        admin?.status === "away" &&
          "bg-warning [mask:radial-gradient(circle_at_25%_25%,transparent_32%,#000_33%)]",
        className,
      )}
    >
      <span className="sr-only">{label}</span>
    </span>
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

/** Texto del estado: «En línea · en el celular», «Ausente…» o «Desconectado · visto hace…». */
export function AdminStatus({ userId, lastSeen }: { userId: string; lastSeen: string | null }) {
  const { online, leftAt } = usePresence();
  // En el servidor no hay hora de referencia: el «visto hace» aparece al hidratar.
  const now = useSyncExternalStore(subscribeClock, getClock, () => null);
  const admin = online[userId];

  if (admin) {
    return (
      <span
        className={cn(
          "text-xs font-medium",
          admin.status === "online" ? "text-success" : "text-warning",
        )}
      >
        {presenceLabel(admin)}
      </span>
    );
  }

  const seen = [leftAt[userId], lastSeen].filter(Boolean).sort().at(-1);
  return (
    <span className="text-xs text-muted-foreground">
      {STATUS_LABEL.offline}
      {seen && now !== null && ` · ${formatLastSeen(seen, now).replace("Visto", "visto")}`}
    </span>
  );
}

const ORDER: Record<PresenceStatus | "offline", number> = { online: 0, away: 1, offline: 2 };

/**
 * Equipo en el encabezado del panel (también en el celular): los avatares con su
 * estado y, al tocarlos, la lista con desde dónde está cada uno o cuándo se vio.
 */
export function TeamPresence() {
  const { team, online, selfId, connection } = usePresence();
  const others = team.filter((member) => member.id !== selfId);
  const active = others.filter((member) => online[member.id]).length;
  const sorted = [...team].sort(
    (a, b) =>
      ORDER[online[a.id]?.status ?? "offline"] - ORDER[online[b.id]?.status ?? "offline"] ||
      Number(b.id === selfId) - Number(a.id === selfId),
  );

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={`Equipo: ${active} de ${others.length} conectados`}
        className="flex items-center gap-2 rounded-full border bg-background py-1 pr-3 pl-1 text-xs font-medium transition-colors outline-none hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        <span className="flex -space-x-1.5" aria-hidden>
          {sorted.slice(0, 3).map((member) => (
            <span
              key={member.id}
              className="relative grid size-7 place-items-center rounded-full bg-secondary text-[0.6875rem] font-semibold ring-2 ring-background [--presence-ring:var(--background)]"
            >
              {member.initials}
              <PresenceDot userId={member.id} className="size-2.5" />
            </span>
          ))}
        </span>
        <span className="hidden sm:inline">
          {active ? (
            `${active} ${active === 1 ? "conectado" : "conectados"}`
          ) : (
            <UsersIcon className="size-4" aria-hidden />
          )}
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 grid w-72 gap-3 rounded-xl border bg-popover p-3 text-popover-foreground shadow-raised data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <p className="px-1 text-eyebrow text-muted-foreground">Administradores · {team.length}</p>
          <ul className="grid gap-1">
            {sorted.map((member) => (
              <li key={member.id} className="flex items-center gap-3 rounded-lg px-1 py-1.5">
                <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-background text-sm font-semibold [--presence-ring:var(--popover)]">
                  {member.initials}
                  <PresenceDot userId={member.id} />
                </span>
                <span className="grid min-w-0 gap-0.5">
                  <span className="truncate text-sm font-semibold">
                    {member.name}
                    {member.id === selfId && (
                      <span className="font-normal text-muted-foreground"> (tú)</span>
                    )}
                  </span>
                  <AdminStatus userId={member.id} lastSeen={member.lastSeen} />
                </span>
              </li>
            ))}
          </ul>
          <p className="flex items-center gap-1.5 border-t px-1 pt-2.5 text-xs text-muted-foreground">
            <span
              aria-hidden
              className={cn(
                "size-1.5 rounded-full",
                connection === "live" ? "bg-success" : "bg-warning",
              )}
            />
            {connection === "live"
              ? "Conectado en tiempo real"
              : connection === "connecting"
                ? "Conectando…"
                : "Sin conexión en tiempo real. Reintentando…"}
          </p>
          <Popover.Arrow className="fill-popover" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
