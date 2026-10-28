"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCheckIcon,
  CheckIcon,
  MessageCircleIcon,
  ReplyIcon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { TeamMember } from "@/features/account/team";
import {
  arrivedAfter,
  firstUnread,
  groupByDay,
  isContinuation,
  messageTime,
  reactionSummary,
  seenBy,
  seenLabel,
  snippet,
} from "@/features/admin-live/format";
import {
  CHAT_REACTION_KEYS,
  CHAT_REACTIONS,
  type ChatMessage,
  type ChatReaction,
} from "@/features/admin-live/types";
import { cn } from "@/lib/utils";
import { PresenceDot, usePresence } from "../admin-presence";
import { MemberAvatar } from "../member-avatar";
import { useLive } from "./live-provider";
import { useNow } from "./use-now";

/** Se deja de anunciar «escribiendo…» tras este tiempo sin teclear. */
const TYPING_IDLE_MS = 2500;
/** A menos de esta distancia del final se considera que se está leyendo lo último. */
const BOTTOM_SLACK_PX = 48;

/** Chat entre los administradores: botón flotante y ventana de mensajes. */
export function AdminChat() {
  const { chatOpen, setChatOpen, unreadChat } = useLive();

  return (
    <>
      <button
        type="button"
        onClick={() => setChatOpen(!chatOpen)}
        aria-expanded={chatOpen}
        aria-label={unreadChat ? `Chat del equipo: ${unreadChat} sin leer` : "Chat del equipo"}
        className="fixed right-[max(1.25rem,env(safe-area-inset-right))] bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-50 grid size-14 place-items-center rounded-full bg-[linear-gradient(145deg,#c4b5fd,#7c3aed)] text-white shadow-[0_14px_34px_-10px_#7c3aedcc] transition-transform duration-300 ease-out-soft outline-none hover:scale-105 focus-visible:ring-4 focus-visible:ring-violet-400/40 active:scale-95"
      >
        <AnimatePresence mode="wait" initial={false}>
          <m.span
            key={chatOpen ? "cerrar" : "abrir"}
            initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.2 }}
          >
            {chatOpen ? (
              <XIcon className="size-6" aria-hidden />
            ) : (
              <MessageCircleIcon className="size-6" aria-hidden />
            )}
          </m.span>
        </AnimatePresence>
        {unreadChat > 0 && !chatOpen && (
          <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[linear-gradient(145deg,#fb7185,#e11d48)] px-1 text-[0.6875rem] font-bold tabular-nums ring-2 ring-background">
            {unreadChat > 99 ? "99+" : unreadChat}
          </span>
        )}
      </button>
      <AnimatePresence>
        {chatOpen && <ChatWindow onClose={() => setChatOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

function ChatWindow({ onClose }: { onClose: () => void }) {
  const { messages, sendMessage, selfId, team, unreadSince, chatReads, reactions, toggleReaction } =
    useLive();
  const { online, setTyping } = usePresence();
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  // En pantallas táctiles no hay «pasar el cursor»: tocar un mensaje muestra sus acciones.
  const [activeId, setActiveId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const flashTimer = useRef<number | undefined>(undefined);
  // Si se está leyendo lo último, los mensajes nuevos bajan solos; si no, se avisa.
  const [atBottom, setAtBottom] = useState(true);
  const [seenUpTo, setSeenUpTo] = useState<string | null>(null);
  const atBottomRef = useRef(true);
  const opened = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<number | undefined>(undefined);
  const id = useId();
  const now = useNow();

  const others = team.filter((member) => member.id !== selfId);
  const typing = others.filter((member) => online[member.id]?.typing);
  const member = (authorId: string) => team.find((item) => item.id === authorId);
  const byId = new Map(messages.map((message) => [message.id, message]));
  const messageDom = (messageId: string) => `${id}-m-${messageId}`;
  const firstName = (userId: string) =>
    userId === selfId ? "Tú" : (member(userId)?.name.split(" ")[0] ?? "Otro admin");
  const divider = firstUnread(messages, selfId, unreadSince);
  const last = messages.at(-1);
  const lastId = last?.id;
  const lastMine = last?.authorId === selfId;
  const below = atBottom ? 0 : arrivedAfter(messages, selfId, seenUpTo);
  const seen = last && lastMine && !last.pending ? seenBy(others, chatReads, last) : [];

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(typingTimer.current);
      window.clearTimeout(flashTimer.current);
      setTyping(false);
    };
  }, [onClose, setTyping]);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    // Al abrir: desde el primer mensaje nuevo, o al final si no hay.
    if (!opened.current) {
      opened.current = true;
      const mark = dividerRef.current;
      list.scrollTop = mark ? mark.offsetTop - 12 : list.scrollHeight;
      return;
    }
    // Después, solo se baja si ya se estaba abajo o si el mensaje es propio.
    if (atBottomRef.current || lastMine) list.scrollTop = list.scrollHeight;
  }, [lastId, lastMine, typing.length]);

  function onScroll() {
    const list = listRef.current;
    if (!list) return;
    const near = list.scrollHeight - list.scrollTop - list.clientHeight < BOTTOM_SLACK_PX;
    // Lo que había hasta salir de abajo ya se vio; lo que llegue después se cuenta.
    if (near || atBottomRef.current) setSeenUpTo(last?.createdAt ?? null);
    atBottomRef.current = near;
    setAtBottom(near);
  }

  function jumpToEnd() {
    const list = listRef.current;
    list?.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }

  function onInput(value: string) {
    setDraft(value);
    setTyping(value.trim().length > 0);
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => setTyping(false), TYPING_IDLE_MS);
  }

  async function send() {
    const text = draft.trim();
    if (!text) return;
    const quoting = replyTo;
    setDraft("");
    setReplyTo(null);
    setTyping(false);
    const ok = await sendMessage(text, quoting?.id ?? null);
    if (!ok) {
      setDraft(text);
      setReplyTo(quoting);
    }
    inputRef.current?.focus();
  }

  function startReply(message: ChatMessage) {
    setReplyTo(message);
    setActiveId(null);
    inputRef.current?.focus();
  }

  function react(messageId: string, emoji: ChatReaction) {
    toggleReaction(messageId, emoji);
    setActiveId(null);
  }

  // Tocar una cita lleva al mensaje original y lo resalta un momento.
  function jumpTo(messageId: string) {
    document
      .getElementById(messageDom(messageId))
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
    setFlashId(messageId);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashId(null), 1400);
  }

  return (
    <m.section
      aria-labelledby={`${id}-title`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="fixed right-[max(1.25rem,env(safe-area-inset-right))] bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+4.5rem)] z-50 grid h-[min(36rem,calc(100dvh-7.5rem))] w-[min(23rem,calc(100vw-2.5rem))] origin-bottom-right grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[1.6rem] border bg-popover/90 text-popover-foreground shadow-[0_28px_70px_-24px_rgb(0_0_0/0.65)] backdrop-blur-2xl"
    >
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <span className="flex -space-x-2">
          {others.slice(0, 3).map((item) => (
            <MemberAvatar
              key={item.id}
              member={item}
              className="size-8 text-[0.6875rem] ring-2 ring-popover [--presence-ring:var(--popover)]"
            >
              <PresenceDot userId={item.id} className="size-2.5" />
            </MemberAvatar>
          ))}
        </span>
        <span className="grid min-w-0 flex-1">
          <h2 id={`${id}-title`} className="truncate text-sm font-semibold">
            Chat del equipo
          </h2>
          <span className="truncate text-xs text-muted-foreground">
            {others.length ? others.map((item) => item.name).join(", ") : "Solo tú por ahora"}
          </span>
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar el chat"
          className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <XIcon className="size-4" aria-hidden />
        </button>
      </header>

      <div className="relative min-h-0">
        <div
          ref={listRef}
          onScroll={onScroll}
          className="relative h-full overflow-y-auto px-3 py-3"
          aria-live="polite"
        >
          {messages.length && now !== null ? (
            groupByDay(messages, now).map((group) => (
              <section key={group.label} aria-label={group.label} className="grid gap-1">
                <p className="sticky top-0 z-10 mx-auto my-2 w-fit rounded-full border bg-popover/95 px-3 py-1 text-[0.6875rem] font-medium text-muted-foreground shadow-[0_4px_12px_-6px_rgb(0_0_0/0.35)] backdrop-blur">
                  {group.label}
                </p>
                {group.items.map((message, index) => {
                  const mine = message.authorId === selfId;
                  const continued = isContinuation(group.items[index - 1], message);
                  const next = group.items[index + 1];
                  const lastOfRun = !next || !isContinuation(message, next);
                  const author = member(message.authorId);
                  const newest = message.id === lastId;
                  const summary = reactionSummary(reactions, message.id, selfId);
                  return (
                    <div key={message.id} className="grid gap-1">
                      {message.id === divider?.id && (
                        <div
                          ref={dividerRef}
                          role="separator"
                          aria-label="Mensajes nuevos"
                          className="my-2 flex items-center gap-2 text-[0.6875rem] font-semibold text-primary"
                        >
                          <span className="h-px flex-1 bg-primary/40" aria-hidden />
                          Mensajes nuevos
                          <span className="h-px flex-1 bg-primary/40" aria-hidden />
                        </div>
                      )}
                      <m.div
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: message.pending ? 0.6 : 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 34 }}
                        className={cn(
                          "group/msg flex items-end gap-2",
                          mine ? "flex-row-reverse" : "flex-row",
                          !continued && "mt-2",
                        )}
                      >
                        {!mine && (
                          <MemberAvatar
                            member={author}
                            className={cn("size-7 text-[0.625rem]", !lastOfRun && "invisible")}
                          />
                        )}
                        <div
                          className={cn("grid max-w-[78%] gap-0.5", mine && "justify-items-end")}
                        >
                          {!mine && !continued && (
                            <span
                              data-admin-accent={author?.accent}
                              className={cn(
                                "px-1 text-[0.6875rem] font-semibold",
                                author ? "text-primary" : "text-muted-foreground",
                              )}
                            >
                              {author?.name ?? "Otro admin"}
                            </span>
                          )}
                          <div id={messageDom(message.id)} className="relative scroll-my-16">
                            {!message.pending && (
                              <MessageActions
                                mine={mine}
                                active={activeId === message.id}
                                summary={summary}
                                onReact={(emoji) => react(message.id, emoji)}
                                onReply={() => startReply(message)}
                                onDismiss={() => setActiveId(null)}
                              />
                            )}
                            <div
                              tabIndex={message.pending ? undefined : 0}
                              aria-keyshortcuts="Enter"
                              onPointerUp={(event) => {
                                if (event.pointerType === "mouse" || message.pending) return;
                                if ((event.target as Element).closest("button")) return;
                                setActiveId((current) =>
                                  current === message.id ? null : message.id,
                                );
                              }}
                              onKeyDown={(event) => {
                                if (event.key !== "Enter" || event.target !== event.currentTarget)
                                  return;
                                event.preventDefault();
                                setActiveId(message.id);
                                // Al abrirse, el foco pasa a la primera reacción.
                                const row = event.currentTarget.parentElement;
                                requestAnimationFrame(() =>
                                  row
                                    ?.querySelector<HTMLButtonElement>("[role=toolbar] button")
                                    ?.focus(),
                                );
                              }}
                              className={cn(
                                "rounded-[1.15rem] px-3 py-2 text-sm leading-snug break-words whitespace-pre-wrap transition-shadow duration-300 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover",
                                mine
                                  ? "bg-[linear-gradient(145deg,var(--primary),color-mix(in_oklab,var(--primary)_80%,black))] text-primary-foreground"
                                  : "bg-secondary text-secondary-foreground",
                                mine
                                  ? lastOfRun
                                    ? "rounded-br-md"
                                    : ""
                                  : lastOfRun
                                    ? "rounded-bl-md"
                                    : "",
                                flashId === message.id &&
                                  "ring-2 ring-ring ring-offset-2 ring-offset-popover",
                              )}
                            >
                              {message.replyTo && (
                                <Quote
                                  target={byId.get(message.replyTo)}
                                  author={member(byId.get(message.replyTo)?.authorId ?? "")}
                                  inMine={mine}
                                  onJump={jumpTo}
                                />
                              )}
                              <span className="sr-only">
                                {mine ? "Tú" : (author?.name ?? "Otro admin")}:{" "}
                              </span>
                              {message.body}
                            </div>
                          </div>
                          {summary.length > 0 && (
                            <div
                              className={cn(
                                "relative z-[1] -mt-2 flex flex-wrap gap-1 px-1",
                                mine ? "justify-end" : "justify-start",
                              )}
                            >
                              {summary.map((item) => {
                                const names = item.userIds.map(firstName).join(", ");
                                return (
                                  <m.button
                                    key={item.emoji}
                                    type="button"
                                    initial={{ scale: 0.4, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 600, damping: 22 }}
                                    onClick={() => toggleReaction(message.id, item.emoji)}
                                    aria-pressed={item.mine}
                                    aria-label={`${CHAT_REACTIONS[item.emoji]}: ${names}`}
                                    title={names}
                                    className={cn(
                                      "inline-flex h-6 items-center gap-1 rounded-full border bg-popover px-1.5 text-xs font-semibold tabular-nums shadow-sm transition-colors hover:bg-secondary",
                                      item.mine && "border-primary/60 bg-primary-soft",
                                    )}
                                  >
                                    <span aria-hidden>{item.emoji}</span>
                                    {item.userIds.length > 1 && (
                                      <span aria-hidden>{item.userIds.length}</span>
                                    )}
                                  </m.button>
                                );
                              })}
                            </div>
                          )}
                          {lastOfRun &&
                            (mine && newest && !message.pending ? (
                              <Receipt
                                time={message.createdAt}
                                seen={seen}
                                others={others.length}
                              />
                            ) : (
                              <span className="px-1 text-[0.625rem] text-muted-foreground">
                                {message.pending ? "Enviando…" : messageTime(message.createdAt)}
                              </span>
                            ))}
                        </div>
                      </m.div>
                    </div>
                  );
                })}
              </section>
            ))
          ) : (
            <div className="grid h-full content-center justify-items-center gap-2 px-6 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-[linear-gradient(145deg,#c4b5fd,#7c3aed)] text-white">
                <MessageCircleIcon className="size-5" aria-hidden />
              </span>
              <p className="text-sm font-semibold">Empieza la conversación</p>
              <p className="text-xs text-muted-foreground">
                Los mensajes llegan al instante a los demás administradores.
              </p>
            </div>
          )}
          <AnimatePresence>
            {typing.length > 0 && (
              <m.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"
              >
                <span className="inline-flex gap-1 rounded-full bg-secondary px-3 py-2" aria-hidden>
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="size-1.5 rounded-full bg-muted-foreground motion-safe:animate-[typing-dot_1.2s_ease-in-out_infinite]"
                      style={{ animationDelay: `${dot * 0.15}s` }}
                    />
                  ))}
                </span>
                {typing.map((item) => item.name.split(" ")[0]).join(" y ")}{" "}
                {typing.length === 1 ? "está escribiendo…" : "están escribiendo…"}
              </m.p>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {!atBottom && (
            <m.button
              type="button"
              onClick={jumpToEnd}
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              aria-label={
                below
                  ? `Ir al final: ${below} ${below === 1 ? "mensaje nuevo" : "mensajes nuevos"}`
                  : "Ir al último mensaje"
              }
              className={cn(
                "absolute inset-x-0 bottom-3 z-20 mx-auto flex h-9 w-fit items-center gap-1.5 rounded-full border shadow-[0_10px_24px_-10px_rgb(0_0_0/0.5)] backdrop-blur-xl",
                below
                  ? "border-transparent bg-primary px-3.5 text-xs font-semibold text-primary-foreground"
                  : "bg-popover/90 px-2.5 text-muted-foreground hover:text-foreground",
              )}
            >
              <ArrowDownIcon className="size-4" aria-hidden />
              {below > 0 && (below === 1 ? "1 nuevo" : `${below > 99 ? "99+" : below} nuevos`)}
            </m.button>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t">
        <AnimatePresence initial={false}>
          {replyTo && (
            <m.div
              key="respuesta"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 px-3 pt-2.5">
                <ReplyIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span
                  data-admin-accent={member(replyTo.authorId)?.accent}
                  className="grid min-w-0 flex-1 border-l-2 border-primary pl-2 text-xs"
                >
                  <span className="font-semibold text-primary">
                    Respondiendo a{" "}
                    {replyTo.authorId === selfId
                      ? "ti"
                      : (member(replyTo.authorId)?.name ?? "Otro admin")}
                  </span>
                  <span className="truncate text-muted-foreground">{snippet(replyTo.body)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setReplyTo(null);
                    inputRef.current?.focus();
                  }}
                  aria-label="Cancelar la respuesta"
                  className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                >
                  <XIcon className="size-3.5" aria-hidden />
                </button>
              </div>
            </m.div>
          )}
        </AnimatePresence>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
          className="flex items-end gap-2 p-3"
        >
          <label htmlFor={`${id}-input`} className="sr-only">
            Mensaje
          </label>
          <textarea
            ref={inputRef}
            id={`${id}-input`}
            rows={1}
            maxLength={2000}
            value={draft}
            placeholder="Escribe un mensaje"
            onChange={(event) => onInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void send();
              }
              if (event.key === "Escape" && replyTo) {
                event.preventDefault();
                event.stopPropagation();
                setReplyTo(null);
              }
            }}
            className="[field-sizing:content] max-h-32 min-h-10 flex-1 resize-none rounded-[1.25rem] border bg-background px-4 py-2.5 text-sm outline-none focus-visible:border-primary"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Enviar"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-[transform,opacity] duration-200 disabled:scale-90 disabled:opacity-40"
          >
            <ArrowUpIcon className="size-5" aria-hidden />
          </button>
        </form>
      </div>
    </m.section>
  );
}

/** Bajo el último mensaje propio: la hora y si ya lo vieron (con sus avatares). */
function Receipt({ time, seen, others }: { time: string; seen: TeamMember[]; others: number }) {
  const read = seen.length > 0;
  return (
    <m.span
      key={read ? "visto" : "enviado"}
      initial={{ opacity: 0, y: -3 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1 px-1 text-[0.625rem] text-muted-foreground"
    >
      {messageTime(time)} ·
      {read ? (
        <>
          <CheckCheckIcon className="size-3 text-primary" aria-hidden />
          {seenLabel(
            seen.map((person) => person.name),
            others,
          )}
          {others > 1 && (
            <span className="ml-0.5 flex -space-x-1" aria-hidden>
              {seen.slice(0, 4).map((person) => (
                <MemberAvatar
                  key={person.id}
                  member={person}
                  className="size-3.5 text-[0.4rem] ring-1 ring-popover"
                />
              ))}
            </span>
          )}
        </>
      ) : (
        <>
          <CheckIcon className="size-3" aria-hidden />
          Enviado
        </>
      )}
    </m.span>
  );
}

/**
 * Reacciones rápidas y «Responder». Aparece al pasar el cursor, al tocar el
 * mensaje en pantallas táctiles o con Enter desde el teclado.
 */
function MessageActions({
  mine,
  active,
  summary,
  onReact,
  onReply,
  onDismiss,
}: {
  mine: boolean;
  active: boolean;
  summary: { emoji: ChatReaction; mine: boolean }[];
  onReact: (emoji: ChatReaction) => void;
  onReply: () => void;
  onDismiss: () => void;
}) {
  const tab = active ? 0 : -1;
  return (
    <div
      role="toolbar"
      aria-label="Reaccionar o responder"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        onDismiss();
        (event.currentTarget.nextElementSibling as HTMLElement | null)?.focus();
      }}
      className={cn(
        "absolute bottom-[calc(100%-0.375rem)] z-20 flex items-center gap-0.5 rounded-full border bg-popover p-1 shadow-[0_10px_28px_-12px_rgb(0_0_0/0.55)] transition-[opacity,scale] duration-150 ease-out",
        mine ? "right-0 origin-bottom-right" : "left-0 origin-bottom-left",
        active
          ? "scale-100 opacity-100"
          : "pointer-events-none scale-90 opacity-0 group-hover/msg:pointer-events-auto group-hover/msg:scale-100 group-hover/msg:opacity-100 group-has-[:focus-visible]/msg:pointer-events-auto group-has-[:focus-visible]/msg:scale-100 group-has-[:focus-visible]/msg:opacity-100",
      )}
    >
      {CHAT_REACTION_KEYS.map((emoji) => {
        const pressed = summary.some((item) => item.emoji === emoji && item.mine);
        return (
          <button
            key={emoji}
            type="button"
            tabIndex={tab}
            onClick={() => onReact(emoji)}
            aria-pressed={pressed}
            aria-label={CHAT_REACTIONS[emoji]}
            title={CHAT_REACTIONS[emoji]}
            className={cn(
              "grid size-7 place-items-center rounded-full text-base transition-[scale,background-color] duration-150 outline-none hover:scale-125 hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
              pressed && "bg-primary-soft",
            )}
          >
            <span aria-hidden>{emoji}</span>
          </button>
        );
      })}
      <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
      <button
        type="button"
        tabIndex={tab}
        onClick={onReply}
        aria-label="Responder"
        title="Responder"
        className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ReplyIcon className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/** Cita dentro de la burbuja: de quién era y el comienzo del mensaje original. */
function Quote({
  target,
  author,
  inMine,
  onJump,
}: {
  target: ChatMessage | undefined;
  author: TeamMember | undefined;
  inMine: boolean;
  onJump: (messageId: string) => void;
}) {
  const box = cn(
    "mb-1.5 grid w-full min-w-0 rounded-lg border-l-[3px] px-2 py-1 text-left text-xs leading-snug",
    inMine ? "border-current/60 bg-black/15" : "border-primary bg-foreground/5",
  );
  if (!target) {
    return <span className={cn(box, "italic opacity-80")}>Respuesta a un mensaje anterior</span>;
  }
  return (
    <button
      type="button"
      onClick={() => onJump(target.id)}
      data-admin-accent={inMine ? undefined : author?.accent}
      aria-label={`Ir al mensaje citado de ${author?.name ?? "otro admin"}`}
      className={cn(box, "transition-opacity hover:opacity-80")}
    >
      <span className={cn("font-semibold", !inMine && "text-primary")}>
        {author?.name ?? "Otro admin"}
      </span>
      <span className="line-clamp-2 opacity-85">{snippet(target.body, 140)}</span>
    </button>
  );
}
