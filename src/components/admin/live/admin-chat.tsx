"use client";

import { ArrowUpIcon, MessageCircleIcon, XIcon } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { groupByDay, isContinuation, messageTime } from "@/features/admin-live/format";
import { cn } from "@/lib/utils";
import { PresenceDot, usePresence } from "../admin-presence";
import { useLive } from "./live-provider";
import { useNow } from "./use-now";

/** Se deja de anunciar «escribiendo…» tras este tiempo sin teclear. */
const TYPING_IDLE_MS = 2500;

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
  const { messages, sendMessage, selfId, team } = useLive();
  const { online, setTyping } = usePresence();
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<number | undefined>(undefined);
  const id = useId();
  const now = useNow();

  const others = team.filter((member) => member.id !== selfId);
  const typing = others.filter((member) => online[member.id]?.typing);
  const member = (authorId: string) => team.find((item) => item.id === authorId);

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

  // Baja al último mensaje cuando llega uno nuevo (o alguien escribe).
  useLayoutEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length, typing.length]);

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
            <span
              key={item.id}
              className="relative grid size-8 place-items-center rounded-full bg-background text-[0.6875rem] font-semibold ring-2 ring-popover [--presence-ring:var(--popover)]"
            >
              {item.initials}
              <PresenceDot userId={item.id} className="size-2.5" />
            </span>
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

      <div ref={listRef} className="overflow-y-auto px-3 py-3" aria-live="polite">
        {messages.length && now !== null ? (
          groupByDay(messages, now).map((group) => (
            <section key={group.label} aria-label={group.label} className="grid gap-1">
              <p className="sticky top-0 z-10 mx-auto my-2 w-fit rounded-full bg-secondary/90 px-3 py-1 text-[0.6875rem] font-medium text-muted-foreground backdrop-blur">
                {group.label}
              </p>
              {group.items.map((message, index) => {
                const mine = message.authorId === selfId;
                const continued = isContinuation(group.items[index - 1], message);
                const next = group.items[index + 1];
                const last = !next || !isContinuation(message, next);
                const author = member(message.authorId);
                return (
                  <m.div
                    key={message.id}
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
                      <span
                        aria-hidden
                        className={cn(
                          "grid size-7 shrink-0 place-items-center rounded-full bg-background text-[0.625rem] font-semibold",
                          !last && "invisible",
                        )}
                      >
                        {author?.initials ?? "?"}
                      </span>
                    )}
                    <div className={cn("grid max-w-[78%] gap-0.5", mine && "justify-items-end")}>
                      {!mine && !continued && (
                        <span className="px-1 text-[0.6875rem] font-medium text-muted-foreground">
                          {author?.name ?? "Otro admin"}
                        </span>
                      )}
                      <p
                        className={cn(
                          "rounded-[1.15rem] px-3 py-2 text-sm leading-snug break-words whitespace-pre-wrap",
                          mine
                            ? "bg-[linear-gradient(145deg,var(--primary),color-mix(in_oklab,var(--primary)_80%,black))] text-primary-foreground"
                            : "bg-secondary text-secondary-foreground",
                          mine ? (last ? "rounded-br-md" : "") : last ? "rounded-bl-md" : "",
                        )}
                      >
                        <span className="sr-only">
                          {mine ? "Tú" : (author?.name ?? "Otro admin")}:{" "}
                        </span>
                        {message.body}
                      </p>
                      {last && (
                        <span className="px-1 text-[0.625rem] text-muted-foreground">
                          {message.pending ? "Enviando…" : messageTime(message.createdAt)}
                        </span>
                      )}
                    </div>
                  </m.div>
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
