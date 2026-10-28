"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCheckIcon,
  CheckIcon,
  MessageCircleIcon,
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
  seenBy,
  seenLabel,
} from "@/features/admin-live/format";
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
  const { messages, sendMessage, selfId, team, unreadSince, chatReads } = useLive();
  const { online, setTyping } = usePresence();
  const [draft, setDraft] = useState("");
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
    setDraft("");
    setTyping(false);
    const ok = await sendMessage(text);
    if (!ok) setDraft(text);
    inputRef.current?.focus();
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
                          "flex items-end gap-2",
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
                          <p
                            className={cn(
                              "rounded-[1.15rem] px-3 py-2 text-sm leading-snug break-words whitespace-pre-wrap",
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
                            )}
                          >
                            <span className="sr-only">
                              {mine ? "Tú" : (author?.name ?? "Otro admin")}:{" "}
                            </span>
                            {message.body}
                          </p>
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

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
        className="flex items-end gap-2 border-t p-3"
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
