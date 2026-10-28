"use client";

import { BellIcon, MessageCirclePlusIcon, Volume2Icon, VolumeXIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Popover } from "radix-ui";
import { useState } from "react";
import { chatSeedFor, groupByDay, timeAgo } from "@/features/admin-live/format";
import { ALERT_META } from "@/features/admin-live/types";
import { cn } from "@/lib/utils";
import { AppIcon } from "./app-icon";
import { useLive } from "./live-provider";
import { useNow } from "./use-now";

/** Campana del encabezado: cuántas alertas faltan por ver y el historial por día. */
export function NotificationBell() {
  const {
    alerts,
    unreadAlerts,
    markAlertsRead,
    sound,
    setSound,
    selfId,
    connected,
    clearToasts,
    composeInChat,
  } = useLive();
  const [open, setOpen] = useState(false);
  const now = useNow();
  // Lo que hizo uno mismo no es una novedad para uno mismo.
  const visible = alerts.filter((alert) => alert.actorId !== selfId);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) clearToasts();
        if (next && unreadAlerts) markAlertsRead();
      }}
    >
      <Popover.Trigger
        aria-label={unreadAlerts ? `Alertas: ${unreadAlerts} sin ver` : "Alertas"}
        className="relative grid size-9 place-items-center rounded-full border bg-background transition-colors outline-none hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        {/* La clave hace sonar la campana cada vez que cambia el número. */}
        <BellIcon
          key={unreadAlerts}
          className={cn("size-4", unreadAlerts > 0 && "animate-bell-ring")}
          aria-hidden
        />
        {unreadAlerts > 0 && (
          <span className="absolute -top-1 -right-1 grid h-[1.15rem] min-w-[1.15rem] place-items-center rounded-full bg-[linear-gradient(145deg,#fb7185,#e11d48)] px-1 text-[0.625rem] font-bold text-white tabular-nums ring-2 ring-card">
            {unreadAlerts > 99 ? "99+" : unreadAlerts}
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={10}
          className="z-50 grid max-h-[min(34rem,calc(100dvh-6rem))] w-[min(24rem,calc(100vw-1.5rem))] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[1.4rem] border bg-popover/90 text-popover-foreground shadow-[0_24px_60px_-20px_rgb(0_0_0/0.6)] backdrop-blur-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
            <p className="font-heading text-lg font-bold font-stretch-112%">Alertas</p>
            <button
              type="button"
              aria-pressed={sound}
              onClick={() => setSound(!sound)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                sound
                  ? "border-primary/50 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {sound ? (
                <Volume2Icon className="size-3.5" aria-hidden />
              ) : (
                <VolumeXIcon className="size-3.5" aria-hidden />
              )}
              Sonido
            </button>
          </div>

          <div className="overflow-y-auto px-2 pb-2">
            {visible.length && now !== null ? (
              groupByDay(visible, now).map((group) => (
                <section key={group.label} aria-label={group.label} className="grid gap-1 pt-2">
                  <p className="px-2 pb-1 text-xs font-semibold text-muted-foreground">
                    {group.label}
                  </p>
                  <ul className="grid gap-1">
                    {group.items.map((alert) => {
                      const seed = chatSeedFor(alert);
                      return (
                        <li key={alert.id} className="group/alert relative">
                          <Link
                            href={(alert.href ?? "/admin") as Route}
                            onClick={() => setOpen(false)}
                            className={cn(
                              "grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-2xl p-2 transition-colors hover:bg-foreground/5 focus-visible:bg-foreground/5 focus-visible:outline-none",
                              seed && "pr-11",
                            )}
                          >
                            <AppIcon kind={alert.kind} />
                            <span className="grid min-w-0 gap-0.5">
                              <span className="flex items-baseline justify-between gap-2 text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                                {ALERT_META[alert.kind].app}
                                <span className="shrink-0 tracking-normal normal-case">
                                  {timeAgo(alert.createdAt, now)}
                                </span>
                              </span>
                              <span className="truncate text-sm font-semibold">{alert.title}</span>
                              {alert.body && (
                                <span className="line-clamp-2 text-[0.8125rem] leading-snug text-muted-foreground">
                                  {alert.body}
                                </span>
                              )}
                            </span>
                          </Link>
                          {seed && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpen(false);
                                composeInChat(seed);
                              }}
                              aria-label={`Comentar en el chat: ${alert.title}`}
                              title="Comentar en el chat"
                              className="absolute right-2 bottom-2 grid size-8 place-items-center rounded-full border bg-popover text-muted-foreground shadow-sm transition-[opacity,color] outline-none group-hover/alert:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring [@media(hover:hover)]:opacity-0"
                            >
                              <MessageCirclePlusIcon className="size-4" aria-hidden />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            ) : (
              <div className="grid justify-items-center gap-2 px-6 py-10 text-center">
                <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-muted-foreground">
                  <BellIcon className="size-5" aria-hidden />
                </span>
                <p className="text-sm font-semibold">Todo al día</p>
                <p className="text-xs text-muted-foreground">
                  Aquí aparecen los pedidos nuevos, los cambios de estado y el stock que se agota.
                </p>
              </div>
            )}
          </div>

          <p className="flex items-center gap-1.5 border-t px-4 py-2.5 text-xs text-muted-foreground">
            <span
              aria-hidden
              className={cn("size-1.5 rounded-full", connected ? "bg-success" : "bg-warning")}
            />
            {connected ? "Recibiendo alertas en tiempo real" : "Conectando…"}
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
