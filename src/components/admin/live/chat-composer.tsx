"use client";

import {
  ArrowUpIcon,
  PackageIcon,
  PackagePlusIcon,
  ReplyIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import Image from "next/image";
import { Popover } from "radix-ui";
import { useEffect, useId, useRef, useState } from "react";
import { searchProducts } from "@/features/admin-live/client-refs";
import { mentionHandles, mentionQuery, snippet } from "@/features/admin-live/format";
import type { ChatMessage, ProductRef } from "@/features/admin-live/types";
import { formatCOP } from "@/lib/format";
import { storageImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";
import { PresenceDot, usePresence } from "../admin-presence";
import { MemberAvatar } from "../member-avatar";
import { useLive } from "./live-provider";

/** Se deja de anunciar «escribiendo…» tras este tiempo sin teclear. */
const TYPING_IDLE_MS = 2500;
const MAX_SUGGESTIONS = 5;

/** Sin tildes ni mayúsculas, para buscar «@jose» y encontrar a José. */
const plain = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/**
 * Campo para escribir: Enter envía, @ sugiere a quién mencionar y el botón del
 * paquete adjunta un producto. Encima van la respuesta y el producto adjunto.
 */
export function ChatComposer({
  replyTo,
  setReplyTo,
  inputRef,
}: {
  replyTo: ChatMessage | null;
  setReplyTo: (message: ChatMessage | null) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const { sendMessage, team, selfId, composeSeed, clearComposeSeed, productRefs, loadRefs } =
    useLive();
  const { setTyping } = usePresence();
  // Lo que llega desde «Comentar en el chat» arranca el borrador.
  const [seedNonce, setSeedNonce] = useState(composeSeed?.nonce);
  const [draft, setDraft] = useState(composeSeed?.text ?? "");
  const [attached, setAttached] = useState<string | null>(composeSeed?.productId ?? null);
  const [picked, setPicked] = useState<ProductRef | null>(null);
  const [caret, setCaret] = useState(draft.length);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const typingTimer = useRef<number | undefined>(undefined);
  const id = useId();

  if (composeSeed && composeSeed.nonce !== seedNonce) {
    setSeedNonce(composeSeed.nonce);
    setDraft((current) => composeSeed.text + current);
    setCaret(composeSeed.text.length);
    if (composeSeed.productId) {
      setAttached(composeSeed.productId);
      setPicked(null);
    }
  }

  // La semilla se usa una vez; al volver a abrir el chat no reaparece.
  useEffect(() => {
    if (composeSeed) clearComposeSeed();
  }, [composeSeed, clearComposeSeed]);

  useEffect(() => () => window.clearTimeout(typingTimer.current), []);

  const attachedProduct = attached
    ? picked?.id === attached
      ? picked
      : productRefs[attached]
    : undefined;
  const missingAttachment = attached && attachedProduct === undefined ? attached : null;
  useEffect(() => {
    if (missingAttachment) void loadRefs([], [missingAttachment]);
  }, [missingAttachment, loadRefs]);

  const handles = mentionHandles(team);
  const query = mentionQuery(draft, caret);
  const suggestions =
    query && query.start !== dismissedAt
      ? team
          .filter((member) => member.id !== selfId)
          .filter((member) =>
            plain(member.name)
              .split(/\s+/)
              .some((word) => word.startsWith(plain(query.query))),
          )
          .slice(0, MAX_SUGGESTIONS)
      : [];
  const activeIndex = Math.min(mentionIndex, Math.max(suggestions.length - 1, 0));
  const canSend = draft.trim().length > 0 || attached !== null;

  function onInput(value: string, position: number) {
    setDraft(value);
    setCaret(position);
    setMentionIndex(0);
    if (!mentionQuery(value, position)) setDismissedAt(null);
    setTyping(value.trim().length > 0);
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => setTyping(false), TYPING_IDLE_MS);
  }

  function pickMention(userId: string) {
    if (!query) return;
    const handle = handles.find((item) => item.userId === userId)?.handle;
    if (!handle) return;
    const next = `${draft.slice(0, query.start)}@${handle} ${draft.slice(caret)}`;
    const position = query.start + handle.length + 2;
    setDraft(next);
    setCaret(position);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(position, position);
    });
  }

  function attach(product: ProductRef) {
    setAttached(product.id);
    setPicked(product);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function send() {
    if (!canSend) return;
    const text = draft.trim();
    const quoting = replyTo;
    const product = { id: attached, ref: picked };
    setDraft("");
    setCaret(0);
    setReplyTo(null);
    setAttached(null);
    setTyping(false);
    const ok = await sendMessage(text, {
      replyTo: quoting?.id ?? null,
      productId: product.id,
      product: product.ref,
    });
    if (!ok) {
      setDraft(text);
      setReplyTo(quoting);
      setAttached(product.id);
      setPicked(product.ref);
    }
    inputRef.current?.focus();
  }

  return (
    <div className="relative border-t">
      <AnimatePresence>
        {suggestions.length > 0 && (
          <m.ul
            id={`${id}-mentions`}
            role="listbox"
            aria-label="Mencionar a"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-3 bottom-full z-30 mb-2 grid gap-0.5 rounded-2xl border bg-popover p-1 shadow-[0_16px_40px_-16px_rgb(0_0_0/0.6)]"
          >
            {suggestions.map((member, index) => (
              <li
                key={member.id}
                role="option"
                aria-selected={index === activeIndex}
                // Que tocar la sugerencia no le quite el foco al campo.
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => pickMention(member.id)}
                onPointerEnter={() => setMentionIndex(index)}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm",
                  index === activeIndex && "bg-secondary",
                )}
              >
                <MemberAvatar
                  member={member}
                  className="size-7 text-[0.625rem] [--presence-ring:var(--popover)]"
                >
                  <PresenceDot userId={member.id} className="size-2.5" />
                </MemberAvatar>
                <span className="grid min-w-0">
                  <span className="truncate font-semibold">{member.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    @{handles.find((item) => item.userId === member.id)?.handle}
                  </span>
                </span>
              </li>
            ))}
          </m.ul>
        )}
      </AnimatePresence>
      <p className="sr-only" aria-live="polite">
        {suggestions.length
          ? `${suggestions.length} sugerencias para mencionar. Flechas para elegir y Enter para usarla.`
          : ""}
      </p>

      <AnimatePresence initial={false}>
        {replyTo && (
          <ComposerBar
            key="respuesta"
            icon={<ReplyIcon className="size-4" aria-hidden />}
            accent={team.find((item) => item.id === replyTo.authorId)?.accent}
            title={`Respondiendo a ${
              replyTo.authorId === selfId
                ? "ti"
                : (team.find((item) => item.id === replyTo.authorId)?.name ?? "Otro admin")
            }`}
            detail={snippet(replyTo.body) || "Producto compartido"}
            cancelLabel="Cancelar la respuesta"
            onCancel={() => {
              setReplyTo(null);
              inputRef.current?.focus();
            }}
          />
        )}
        {attached && (
          <ComposerBar
            key="producto"
            icon={<PackageIcon className="size-4" aria-hidden />}
            title={
              attachedProduct === undefined
                ? "Cargando producto…"
                : attachedProduct === null
                  ? "Este producto ya no existe"
                  : attachedProduct.name
            }
            detail={
              attachedProduct
                ? `${formatCOP(attachedProduct.price)} · se compartirá su tarjeta`
                : "Quítalo para enviar solo el texto"
            }
            cancelLabel="Quitar el producto"
            onCancel={() => {
              setAttached(null);
              inputRef.current?.focus();
            }}
          />
        )}
      </AnimatePresence>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
        className="flex items-end gap-2 p-3"
      >
        <ProductPicker onPick={attach} />
        <label htmlFor={`${id}-input`} className="sr-only">
          Mensaje
        </label>
        <textarea
          ref={inputRef}
          id={`${id}-input`}
          rows={1}
          maxLength={2000}
          value={draft}
          placeholder="Escribe… @ para mencionar"
          onChange={(event) =>
            onInput(event.target.value, event.target.selectionStart ?? event.target.value.length)
          }
          onSelect={(event) => setCaret(event.currentTarget.selectionStart ?? 0)}
          onKeyDown={(event) => {
            if (suggestions.length) {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                const step = event.key === "ArrowDown" ? 1 : -1;
                setMentionIndex((activeIndex + step + suggestions.length) % suggestions.length);
                return;
              }
              if ((event.key === "Enter" && !event.shiftKey) || event.key === "Tab") {
                event.preventDefault();
                const chosen = suggestions[activeIndex];
                if (chosen) pickMention(chosen.id);
                return;
              }
              if (event.key === "Escape" && query) {
                event.preventDefault();
                event.stopPropagation();
                setDismissedAt(query.start);
                return;
              }
            }
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void send();
            }
            // Escape quita primero la respuesta y el adjunto; después cierra el chat.
            if (event.key === "Escape" && (replyTo || attached)) {
              event.preventDefault();
              event.stopPropagation();
              if (replyTo) setReplyTo(null);
              else setAttached(null);
            }
          }}
          className="[field-sizing:content] max-h-32 min-h-10 min-w-0 flex-1 resize-none rounded-[1.25rem] border bg-background px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground/80 focus-visible:border-primary"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Enviar"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-[transform,opacity] duration-200 disabled:scale-90 disabled:opacity-40"
        >
          <ArrowUpIcon className="size-5" aria-hidden />
        </button>
      </form>
    </div>
  );
}

/** Franja sobre el campo: a qué se responde o qué producto va adjunto. */
function ComposerBar({
  icon,
  accent,
  title,
  detail,
  cancelLabel,
  onCancel,
}: {
  icon: React.ReactNode;
  accent?: string;
  title: string;
  detail: string;
  cancelLabel: string;
  onCancel: () => void;
}) {
  return (
    <m.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="overflow-hidden"
    >
      <div className="flex items-center gap-2 px-3 pt-2.5">
        <span className="shrink-0 text-muted-foreground">{icon}</span>
        <span
          data-admin-accent={accent}
          className="grid min-w-0 flex-1 border-l-2 border-primary pl-2 text-xs"
        >
          <span className="truncate font-semibold text-primary">{title}</span>
          <span className="truncate text-muted-foreground">{detail}</span>
        </span>
        <button
          type="button"
          onClick={onCancel}
          aria-label={cancelLabel}
          className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <XIcon className="size-3.5" aria-hidden />
        </button>
      </div>
    </m.div>
  );
}

/** Buscador de productos para compartir uno en el chat. */
function ProductPicker({ onPick }: { onPick: (product: ProductRef) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // null = buscando.
  const [results, setResults] = useState<ProductRef[] | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const request = useRef(0);
  // Tras elegir, el foco va al campo de texto (no de vuelta al botón).
  const chose = useRef(false);
  const id = useId();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function search(term: string) {
    window.clearTimeout(timer.current);
    setResults(null);
    timer.current = window.setTimeout(async () => {
      // Solo cuenta la respuesta de la última búsqueda.
      const mine = ++request.current;
      const found = await searchProducts(term);
      if (mine === request.current) setResults(found ?? []);
    }, 200);
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQuery("");
          search("");
        }
      }}
    >
      <Popover.Trigger
        aria-label="Compartir un producto"
        title="Compartir un producto"
        className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-secondary data-[state=open]:text-foreground"
      >
        <PackagePlusIcon className="size-5" aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          onCloseAutoFocus={(event) => {
            if (chose.current) event.preventDefault();
            chose.current = false;
          }}
          sideOffset={10}
          className="z-[60] grid w-[min(20rem,calc(100vw-2rem))] gap-2 rounded-2xl border bg-popover p-2 text-popover-foreground shadow-[0_20px_50px_-18px_rgb(0_0_0/0.6)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <label htmlFor={`${id}-q`} className="sr-only">
            Buscar producto por nombre o SKU
          </label>
          <span className="flex items-center gap-2 rounded-xl border bg-background px-3">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              id={`${id}-q`}

              value={query}
              placeholder="Nombre o SKU"
              onChange={(event) => {
                setQuery(event.target.value);
                search(event.target.value);
              }}
              className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </span>
          <div className="grid max-h-72 gap-0.5 overflow-y-auto" aria-live="polite">
            {results === null ? (
              Array.from({ length: 3 }, (_, index) => (
                <span key={index} className="h-14 animate-pulse rounded-xl bg-secondary/70" />
              ))
            ) : results.length ? (
              results.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => {
                    chose.current = true;
                    onPick(product);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2.5 rounded-xl p-1.5 text-left transition-colors outline-none hover:bg-secondary focus-visible:bg-secondary"
                >
                  <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border bg-secondary text-muted-foreground">
                    {product.image ? (
                      <Image
                        src={storageImageUrl(product.image.path)}
                        alt=""
                        fill
                        sizes="44px"
                        className="object-contain p-1"
                      />
                    ) : (
                      <PackageIcon className="size-4" aria-hidden />
                    )}
                  </span>
                  <span className="grid min-w-0">
                    <span className="truncate text-sm font-semibold">{product.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {formatCOP(product.price)} · {product.stock} en stock
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                {query.trim() ? `No hay productos con «${query.trim()}».` : "Aún no hay productos."}
              </p>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
