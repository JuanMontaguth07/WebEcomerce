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
import {
  alertTarget,
  mentionHandles,
  mentionsIn,
  mergeMessage,
  mergeReaction,
  snippet,
  unreadAlerts,
  unreadMessages,
} from "@/features/admin-live/format";
import { toAlert, toMessage, toReaction } from "@/features/admin-live/mappers";
import type { AdminLiveData } from "@/features/admin-live/queries";
import {
  ALERT_KINDS,
  CHAT_REACTIONS,
  type ChatMessage,
  type ChatReaction,
  type LiveAlert,
  type MessageReaction,
  type OrderRef,
  type ProductRef,
} from "@/features/admin-live/types";
import { fetchOrders, fetchProducts } from "@/features/admin-live/client-refs";
import type { TeamMember } from "@/features/account/team";
import { latest } from "@/features/account/presence";
import { createClient } from "@/lib/supabase/client";
import { usePresence } from "../admin-presence";
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
  /** Lectura anterior a abrir el chat: marca dónde empiezan los mensajes nuevos. */
  unreadSince: string | null;
  /** Hasta cuándo leyó el chat cada admin (base + lo anunciado en esta visita). */
  chatReads: Record<string, string>;
  sendMessage: (
    body: string,
    extra?: { replyTo?: string | null; productId?: string | null; product?: ProductRef | null },
  ) => Promise<boolean>;
  /** Mensajes sin leer que mencionan a este admin. */
  unreadMentions: number;
  /** Pedidos (#número) y productos citados en el chat; null = no existe. */
  orderRefs: Record<number, OrderRef | null>;
  productRefs: Record<string, ProductRef | null>;
  loadRefs: (orderNumbers: number[], productIds: string[]) => Promise<void>;
  /** Abre el chat con un borrador listo (desde una alerta, un pedido o un producto). */
  composeInChat: (seed: { text?: string; productId?: string | null }) => void;
  composeSeed: ComposeSeed | null;
  clearComposeSeed: () => void;
  reactions: MessageReaction[];
  /** Pone o quita la reacción propia con ese emoji. */
  toggleReaction: (messageId: string, emoji: ChatReaction) => void;
  toasts: LiveAlert[];
  dismissToast: (id: string) => void;
  /** Recoge todas las flotantes (al abrir la campana, como el centro de notificaciones). */
  clearToasts: () => void;
  sound: boolean;
  setSound: (on: boolean) => void;
  connected: boolean;
};

export type ComposeSeed = { nonce: number; text: string; productId: string | null };

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
const isReaction = (emoji: string) => Object.hasOwn(CHAT_REACTIONS, emoji);

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
  const [reactions, setReactions] = useState(initial.reactions);
  const [orderRefs, setOrderRefs] = useState<Record<number, OrderRef | null>>({});
  const [productRefs, setProductRefs] = useState<Record<string, ProductRef | null>>({});
  const [composeSeed, setComposeSeed] = useState<ComposeSeed | null>(null);
  const refsRef = useRef({ orderRefs, productRefs });
  useEffect(() => {
    refsRef.current = { orderRefs, productRefs };
  }, [orderRefs, productRefs]);
  const loadingRefs = useRef(new Set<string>());
  const reactionsRef = useRef(reactions);
  useEffect(() => {
    reactionsRef.current = reactions;
  }, [reactions]);
  const [alertsReadAt, setAlertsReadAt] = useState(initial.alertsReadAt);
  const [chatReadAt, setChatReadAt] = useState(initial.chatReadAt);
  const [toasts, setToasts] = useState<LiveAlert[]>([]);
  const [chatOpen, setChatOpenState] = useState(false);
  const [unreadSince, setUnreadSince] = useState<string | null>(null);
  const { chatReads: announcedReads, announceChatRead } = usePresence();
  const chatReadRef = useRef(initial.chatReadAt);
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
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
    if (soundRef.current) {
      playChime(
        alert.kind === "stock_out"
          ? "red"
          : alert.kind === "chat" || alert.kind === "mention"
            ? "violet"
            : "green",
      );
    }
  }, []);

  const dismissToast = useCallback(
    (id: string) => setToasts((current) => current.filter((item) => item.id !== id)),
    [],
  );

  const clearToasts = useCallback(() => setToasts([]), []);

  const markRead = useCallback((what: "alerts" | "chat") => {
    const now = new Date().toISOString();
    if (what === "alerts") setAlertsReadAt(now);
    else {
      chatReadRef.current = now;
      setChatReadAt(now);
    }
    void createClient().rpc("mark_admin_read", { p_what: what });
  }, []);

  const markAlertsRead = useCallback(() => markRead("alerts"), [markRead]);

  // Los demás ven «Visto» hasta el último mensaje que este admin tuvo delante.
  // Se anuncia la hora de ese mensaje (de la base), no la del reloj del equipo.
  const markChatRead = useCallback(
    (upTo?: string) => {
      markRead("chat");
      // Los propios aún sin confirmar llevan la hora del equipo: no cuentan.
      const shown = messagesRef.current.findLast((message) => !message.pending);
      const read = latest([upTo, shown?.createdAt]);
      if (read) announceChatRead(read);
    },
    [markRead, announceChatRead],
  );

  const setChatOpen = useCallback(
    (open: boolean) => {
      if (open && !chatOpenRef.current) setUnreadSince(chatReadRef.current);
      chatOpenRef.current = open;
      setChatOpenState(open);
      if (open) {
        markChatRead();
        // Al abrir el chat se van sus avisos flotantes.
        setToasts((current) =>
          current.filter((item) => item.kind !== "chat" && item.kind !== "mention"),
        );
      }
    },
    [markChatRead],
  );

  // Con el chat abierto en una pestaña de fondo, lo nuevo se da por leído al volver.
  useEffect(() => {
    const onVisible = () => {
      if (chatOpenRef.current && document.visibilityState === "visible") markChatRead();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [markChatRead]);

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
            // El pedido o el producto cambió: su tarjeta en el chat se vuelve a pedir.
            const target = alertTarget(alert.href);
            if (target?.kind === "order") {
              setOrderRefs((current) =>
                Object.fromEntries(
                  Object.entries(current).filter(([, order]) => order?.id !== target.id),
                ),
              );
            }
            if (target?.kind === "product") {
              setProductRefs((current) =>
                target.id in current
                  ? Object.fromEntries(Object.entries(current).filter(([id]) => id !== target.id))
                  : current,
              );
            }
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
              markChatRead(message.createdAt);
            } else {
              const mentioned = message.mentions?.includes(selfId);
              pushToast({
                id: `chat-${message.id}`,
                kind: mentioned ? "mention" : "chat",
                title: mentioned
                  ? `${nameOf(message.authorId)} te mencionó`
                  : nameOf(message.authorId),
                body: message.body.trim() ? message.body : "Compartió un producto",
                href: null,
                actorId: message.authorId,
                createdAt: message.createdAt,
              });
            }
          },
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "admin_message_reactions" },
          ({ new: row }) => {
            const reaction = toReaction(row as Parameters<typeof toReaction>[0]);
            if (!isReaction(reaction.emoji)) return;
            setReactions((current) => mergeReaction(current, reaction));
            // Avisa cuando reaccionan a un mensaje propio y el chat no está a la vista.
            const target = messagesRef.current.find((item) => item.id === reaction.messageId);
            const visible = chatOpenRef.current && document.visibilityState === "visible";
            if (reaction.userId === selfId || target?.authorId !== selfId || visible) return;
            pushToast({
              id: `reaccion-${reaction.id}`,
              kind: "chat",
              title: `${nameOf(reaction.userId)} reaccionó ${reaction.emoji}`,
              body: snippet(target.body),
              href: null,
              actorId: reaction.userId,
              createdAt: new Date().toISOString(),
            });
          },
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "admin_message_reactions" },
          ({ old }) => {
            // Al borrar, Realtime solo entrega la clave.
            const id = (old as { id?: string }).id;
            if (id) setReactions((current) => current.filter((reaction) => reaction.id !== id));
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
  }, [selfId, pushToast, markChatRead]);

  const sendMessage = useCallback(
    async (
      body: string,
      {
        replyTo = null,
        productId = null,
        product = null,
      }: { replyTo?: string | null; productId?: string | null; product?: ProductRef | null } = {},
    ) => {
      const text = body.trim();
      if (!text && !productId) return false;
      // El producto elegido en el buscador ya se conoce: su tarjeta sale al instante.
      if (product && product.id === productId) {
        setProductRefs((current) => ({ ...current, [product.id]: product }));
      }
      const mentions = mentionsIn(text, mentionHandles(teamRef.current)).filter(
        (id) => id !== selfId,
      );
      const tempId = `pendiente-${crypto.randomUUID()}`;
      setMessages((current) =>
        mergeMessage(current, {
          id: tempId,
          authorId: selfId,
          body: text,
          replyTo,
          productId,
          mentions,
          createdAt: new Date().toISOString(),
          pending: true,
        }),
      );
      const { data, error } = await createClient()
        .from("admin_messages")
        .insert({ body: text, reply_to: replyTo, product_id: productId, mentions })
        .select("id, author_id, body, reply_to, product_id, mentions, created_at")
        .single();
      setMessages((current) => {
        const without = current.filter((message) => message.id !== tempId);
        return data ? mergeMessage(without, toMessage(data)) : without;
      });
      return !error;
    },
    [selfId],
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: ChatReaction) => {
      const supabase = createClient();
      const existing = reactionsRef.current.find(
        (reaction) =>
          reaction.messageId === messageId &&
          reaction.userId === selfId &&
          reaction.emoji === emoji,
      );
      // Un doble toque mientras la base confirma no hace nada.
      if (existing?.pending) return;
      if (existing) {
        setReactions((current) => current.filter((reaction) => reaction.id !== existing.id));
        const { error } = await supabase
          .from("admin_message_reactions")
          .delete()
          .eq("id", existing.id);
        if (error) setReactions((current) => mergeReaction(current, existing));
        return;
      }
      const pending: MessageReaction = {
        id: `pendiente-${crypto.randomUUID()}`,
        messageId,
        userId: selfId,
        emoji,
        pending: true,
      };
      setReactions((current) => mergeReaction(current, pending));
      const { data, error } = await supabase
        .from("admin_message_reactions")
        .insert({ message_id: messageId, emoji })
        .select("id, message_id, user_id, emoji")
        .single();
      setReactions((current) =>
        data && !error
          ? mergeReaction(current, toReaction(data))
          : current.filter((reaction) => reaction.id !== pending.id),
      );
    },
    [selfId],
  );

  // Pide lo que falta, una sola vez por pedido o producto mientras no cambie.
  const loadRefs = useCallback(async (orderNumbers: number[], productIds: string[]) => {
    const { orderRefs: orders, productRefs: products } = refsRef.current;
    const loading = loadingRefs.current;
    const numbers = orderNumbers.filter((n) => !(n in orders) && !loading.has(`o${n}`));
    const ids = productIds.filter((id) => !(id in products) && !loading.has(`p${id}`));
    if (!numbers.length && !ids.length) return;
    numbers.forEach((n) => loading.add(`o${n}`));
    ids.forEach((id) => loading.add(`p${id}`));
    const [foundOrders, foundProducts] = await Promise.all([
      fetchOrders(numbers),
      fetchProducts(ids),
    ]);
    numbers.forEach((n) => loading.delete(`o${n}`));
    ids.forEach((id) => loading.delete(`p${id}`));
    // Si la consulta falla no se guarda nada: se reintenta en la próxima vista.
    if (foundOrders) {
      const byNumber = new Map(foundOrders.map((order) => [order.number, order]));
      setOrderRefs((current) => ({
        ...current,
        ...Object.fromEntries(numbers.map((n) => [n, byNumber.get(n) ?? null])),
      }));
    }
    if (foundProducts) {
      const byId = new Map(foundProducts.map((product) => [product.id, product]));
      setProductRefs((current) => ({
        ...current,
        ...Object.fromEntries(ids.map((id) => [id, byId.get(id) ?? null])),
      }));
    }
  }, []);

  const composeInChat = useCallback(
    ({ text = "", productId = null }: { text?: string; productId?: string | null }) => {
      setComposeSeed({ nonce: Date.now(), text, productId });
      setChatOpen(true);
    },
    [setChatOpen],
  );

  const clearComposeSeed = useCallback(() => setComposeSeed(null), []);

  const unreadChat = chatOpen ? 0 : unreadMessages(messages, selfId, chatReadAt);
  const unreadMentions = chatOpen
    ? 0
    : unreadMessages(
        messages.filter((message) => message.mentions?.includes(selfId)),
        selfId,
        chatReadAt,
      );
  const chatReads = Object.fromEntries(
    team.flatMap((member) => {
      const read = latest([initial.teamChatReads[member.id], announcedReads[member.id]]);
      return read ? [[member.id, read]] : [];
    }),
  );
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
        unreadSince,
        chatReads,
        sendMessage,
        unreadMentions,
        orderRefs,
        productRefs,
        loadRefs,
        composeInChat,
        composeSeed,
        clearComposeSeed,
        reactions,
        toggleReaction: (messageId, emoji) => void toggleReaction(messageId, emoji),
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
