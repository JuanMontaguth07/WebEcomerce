"use client";

import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { countdown, type FeaturedBuild } from "@/features/architect/featured";
import { PART_LABELS } from "@/features/compatibility/types";
import { formatCOP } from "@/lib/format";

/** Reloj compartido: avisa cada segundo. En el servidor no hay hora (se muestra «--»). */
function subscribe(callback: () => void) {
  const timer = window.setInterval(callback, 1000);
  return () => window.clearInterval(timer);
}
const now = () => Math.floor(Date.now() / 1000) * 1000;
const serverNow = () => null;

const UNITS = [
  ["days", "días"],
  ["hours", "horas"],
  ["minutes", "min"],
  ["seconds", "seg"],
] as const;

/**
 * Banda de la «PC de la semana»: la PC armada que eligió el admin, su texto,
 * el total de hoy y la cuenta regresiva. Al llegar a cero desaparece sola.
 */
export function PcOfTheWeek({ build }: { build: FeaturedBuild }) {
  const time = useSyncExternalStore(subscribe, now, serverNow);
  const left =
    time === null || !build.spotlightUntil ? undefined : countdown(build.spotlightUntil, time);
  if (left === null) return null;

  const highlight = (["gpu", "cpu"] as const).flatMap((kind) =>
    build.components.filter((part) => part.kind === kind).slice(0, 1),
  );

  return (
    <section
      aria-labelledby="pc-semana"
      className="zone-gradient relative grid gap-6 overflow-hidden rounded-3xl p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-10"
    >
      <div
        aria-hidden
        className="zone-breathe pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-white/20 blur-2xl"
      />
      <div className="relative grid gap-3">
        <p className="text-eyebrow opacity-80">PC de la semana</p>
        <h2
          id="pc-semana"
          className="text-3xl leading-[1.05] font-black text-balance font-stretch-118% md:text-5xl"
        >
          {build.title}
        </h2>
        {(build.spotlightNote ?? build.description) && (
          <p className="max-w-xl font-medium">{build.spotlightNote ?? build.description}</p>
        )}
        {highlight.length > 0 && (
          <ul className="flex flex-wrap gap-2 text-sm">
            {highlight.map((part) => (
              <li key={part.kind} className="rounded-full bg-black/15 px-3 py-1">
                <span className="opacity-75">{PART_LABELS[part.kind]}:</span>{" "}
                <span className="font-semibold">{part.name}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <Link
            href={`/arma-tu-pc/${build.code}`}
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-background px-6 font-semibold text-foreground transition-transform duration-200 hover:-translate-y-0.5"
          >
            Ver la PC
            <ArrowRightIcon className="size-4" aria-hidden />
          </Link>
          {build.total > 0 && (
            <span className="font-heading text-2xl font-extrabold font-stretch-110% tabular-nums">
              {build.unpriced > 0 && (
                <span className="mr-1 font-sans text-sm font-medium">Desde</span>
              )}
              {formatCOP(build.total)}
            </span>
          )}
        </div>
      </div>
      <div className="relative grid gap-2">
        <p className="text-xs font-semibold opacity-80">Termina en</p>
        <div className="flex gap-2" role="timer" aria-label="Tiempo que queda">
          {UNITS.map(([key, label]) => (
            <div
              key={key}
              className="grid min-w-16 justify-items-center rounded-2xl bg-black/15 px-2 py-3"
            >
              <span className="font-heading text-3xl leading-none font-extrabold tabular-nums">
                {left ? String(left[key]).padStart(2, "0") : "--"}
              </span>
              <span className="font-mono text-[0.625rem] tracking-wider uppercase opacity-80">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
