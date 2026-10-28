"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { mergeMessage, unreadAlerts, unreadMessages } from "@/features/admin-live/format";
import { toAlert, toMessage } from "@/features/admin-live/mappers";
import type { AdminLiveData } from "@/features/admin-live/queries";
import { ALERT_KINDS, type ChatMessage, type LiveAlert } from "@/features/admin-live/types";
import type { TeamMember } from "@/features/account/team";
import { createClient } from "@/lib/supabase/client";
import { playChime } from "./chime";

/** Cuánto queda a la vista cada notificación flotante (se pausa con el cursor encima). */
export const TOAST_MS = 7000;
/** Notificaciones flotantes como máximo a la vez; las demás quedan en la campana. */
const MAX_TOASTS = 4;
const SOUND_KEY = "admin:alert-sound:v1";

type LiveValue = {
  selfId: string;
  team: TeamMember[];
  alerts: LiveAlert[];
  unreadAlerts: number;
  markAlertsRead: () => void;
  messages: ChatMessage[];
  unreadChat: number;
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  sendMessage: (body: string) => Promise<boolean>;
  toasts: LiveAlert[];
  dismissToast: (id: string) => void;
  /** Recoge todas las flotantes (al abrir la campana, como el centro de notificaciones). */
  clearToasts: () => void;
  sound: boolean;
  setSound: (on: boolean) => void;
  connected: boolean;
};

const LiveContext = createContext<LiveValue | null>(null);

// La preferencia de sonido vive en este navegador (y se sincroniza entre pestañas).
const soundListeners = new Set<() => void>();
let soundMemory = false;

function readSound(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) === "1";
  } catch {
    return soundMemory;
  }
}

function writeSound(on: boolean) {
  soundMemory = on;
  try {
    window.localStorage.setItem(SOUND_KEY, on ? "1" : "0");
  } catch {
    // Almacenamiento bloqueado: dura solo esta visita.
  }
  soundListeners.forEach((notify) => notify());
}

function subscribeSound(listener: () => void) {
  soundListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === SOUND_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    soundListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useLive(): LiveValue {
  const value = use(LiveContext);
  if (!value) throw new Error("useLive necesita AdminLiveProvider");
  return value;
}

const isAlertKind = (kind: string) => (ALERT_KINDS as readonly string[]).includes(kind);

/**
 * Alertas y chat del panel en tiempo real. Las alertas las genera la base
 * (pedidos y stock); aquí se escuchan por Realtime, se muestran como
 * notificaciones flotantes y se acumulan en la campana. Lo que hace uno mismo
 * no le avisa a uno mismo.
 */
export function AdminLiveProvider({
  selfId,
  team,
  initial,
  children,
}: {
  selfId: string;
  team: TeamMember[];
  initial: AdminLiveData;
  children: React.ReactNode;
}) {
  const [alerts, setAlerts] = useState(initial.alerts);
  const [messages, setMessages] = useState(initial.messages);
  const [alertsReadAt, setAlertsReadAt] = useState(initial.alertsReadAt);
  const [chatReadAt, setChatReadAt] = useState(initial.chatReadAt);
  const [toasts, setToasts] = useState<LiveAlert[]>([]);
  const [chatOpen, setChatOpenState] = useState(false);
  const [connected, setConnected] = useState(false);
  const sound = useSyncExternalStore(subscribeSound, readSound, () => false);
  const chatOpenRef = useRef(false);
  // La lista llega nueva en cada actualización del servidor: el canal no debe reabrirse por eso.
  const teamRef = useRef(team);
  useEffect(() => {
    teamRef.current = team;
  }, [team]);
  const soundRef = useRef(sound);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  const setSound = useCallback((on: boolean) => {
    soundRef.current = on;
    writeSound(on);
    if (on) playChime("violet");
  }, []);

  const pushToast = useCallback((alert: LiveAlert) => {
    setToasts((current) =>
      [alert, ...current.filter((item) => item.id !== alert.id)].slice(0, MAX_TOASTS),
    );
    if (soundRef.current) playChime(alert.kind === "stock_out" ? "red" : "green");
  }, []);

  const dismissToast = useCallback(
    (id: string) => setToasts((current) => current.filter((item) => item.id !== id)),
    [],
  );

  const clearToasts = useCallback(() => setToasts([]), []);

  const markRead = useCallback((what: "alerts" | "chat") => {
    const now = new Date().toISOString();
    if (what === "alerts") setAlertsReadAt(now);
    else setChatReadAt(now);
    void createClient().rpc("mark_admin_read", { p_what: what });
  }, []);

  const markAlertsRead = useCallback(() => markRead("alerts"), [markRead]);

  const setChatOpen = useCallback(
    (open: boolean) => {
      chatOpenRef.current = open;
      setChatOpenState(open);
      if (open) {
        markRead("chat");
        // Al abrir el chat se van sus avisos flotantes.
        setToasts((current) => current.filter((item) => item.kind !== "chat"));
      }
    },
    [markRead],
  );

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    let joinedOnce = false;
    const nameOf = (id: string) =>
      teamRef.current.find((member) => member.id === id)?.name ?? "Otro admin";

    // Al reconectarse se piden las alertas que pudieron perderse mientras tanto.
    const catchUp = async () => {
      const { data } = await supabase
        .from("admin_alerts")
        .select("id, kind, title, body, href, actor_id, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (!data) return;
      setAlerts((current) => {
        const known = new Set(current.map((alert) => alert.id));
        const fresh = data
          .filter((row) => isAlertKind(row.kind) && !known.has(row.id))
          .map(toAlert);
        return [...fresh, ...current]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 60);
      });
    };

    void (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel = supabase
        .channel("admin-live")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "admin_alerts" },
          ({ new: row }) => {
            const alert = toAlert(row as Parameters<typeof toAlert>[0]);
            if (!isAlertKind(alert.kind)) return;
            setAlerts((current) =>
              [alert, ...current.filter((item) => item.id !== alert.id)].slice(0, 60),
            );
            if (alert.actorId !== selfId) pushToast(alert);
          },
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "admin_messages" },
          ({ new: row }) => {
            const message = toMessage(row as Parameters<typeof toMessage>[0]);
            setMessages((current) => mergeMessage(current, message));
            if (message.authorId === selfId) return;
            const visible = chatOpenRef.current && document.visibilityState === "visible";
            if (visible) {
              markRead("chat");
            } else {
              pushToast({
                id: `chat-${message.id}`,
                kind: "chat",
                title: nameOf(message.authorId),
                body: message.body,
                href: null,
                actorId: message.authorId,
                createdAt: message.createdAt,
              });
            }
          },
        )
        .subscribe((state) => {
          setConnected(state === "SUBSCRIBED");
          if (state === "SUBSCRIBED") {
            if (joinedOnce) void catchUp();
            joinedOnce = true;
          }
        });
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [selfId, pushToast, markRead]);

  const sendMessage = useCallback(
    async (body: string) => {
      const text = body.trim();
      if (!text) return false;
      const tempId = `pendiente-${crypto.randomUUID()}`;
      setMessages((current) =>
        mergeMessage(current, {
          id: tempId,
          authorId: selfId,
          body: text,
          createdAt: new Date().toISOString(),
          pending: true,
        }),
      );
      const { data, error } = await createClient()
        .from("admin_messages")
        .insert({ body: text })
        .select("id, author_id, body, created_at")
        .single();
      setMessages((current) => {
        const without = current.filter((message) => message.id !== tempId);
        return data ? mergeMessage(without, toMessage(data)) : without;
      });
      return !error;
    },
    [selfId],
  );

  const unreadChat = chatOpen ? 0 : unreadMessages(messages, selfId, chatReadAt);
  const unreadAlertCount = unreadAlerts(alerts, selfId, alertsReadAt);

  // El número de pendientes también en la pestaña del navegador: «(3) Admin · …».
  const badge = unreadAlertCount + unreadChat;
  useEffect(() => {
    const apply = () => {
      const base = document.title.replace(/^\(\d+\)\s/, "");
      const next = badge ? `(${badge}) ${base}` : base;
      if (document.title !== next) document.title = next;
    };
    apply();
    // Next cambia el título al navegar: se vuelve a poner el número.
    const title = document.querySelector("title");
    const observer = title ? new MutationObserver(apply) : null;
    if (title) observer?.observe(title, { childList: true });
    return () => observer?.disconnect();
  }, [badge]);

  return (
    <LiveContext
      value={{
        selfId,
        team,
        alerts,
        unreadAlerts: unreadAlertCount,
        markAlertsRead,
        messages,
        unreadChat,
        chatOpen,
        setChatOpen,
        sendMessage,
        toasts,
        dismissToast,
        clearToasts,
        sound,
        setSound,
        connected,
      }}
    >
      {children}
    </LiveContext>
  );
}
