"use client";

import { ArrowRightIcon, CpuIcon, LightbulbIcon, ScaleIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import type { MascotMood } from "@/features/mascot/store";
import { tipsFor } from "@/features/mascot/tips";
import { PART_KINDS } from "@/features/compatibility/types";
import { Kovi } from "./kovi";
import { useKoviEyes } from "./use-kovi-eyes";

/** Un consejo de cada pieza, para que se vea de todo. */
const SAMPLE = PART_KINDS.flatMap((kind) => tipsFor(kind).slice(0, 1));

const SKILLS = [
  {
    Icon: CpuIcon,
    title: "Revisa que todo encaje",
    text: "Socket, memoria, medidas y consumo, al momento.",
  },
  {
    Icon: LightbulbIcon,
    title: "Consejos de cada pieza",
    text: "En la ficha de cada producto, lo que conviene saber.",
  },
  {
    Icon: ScaleIcon,
    title: "Compara precios",
    text: "Te muestra si sale mejor aquí o en otra tienda.",
  },
];

/**
 * «Conoce a Kovi» en el inicio: quién es la mascota y qué hace, con Kovi en
 * grande. Al tocarlo (o «Otro consejo») da un consejo y cambia de gesto.
 */
export function MeetKovi() {
  const box = useRef<HTMLButtonElement>(null);
  const [index, setIndex] = useState(0);
  const [mood, setMood] = useState<MascotMood>("happy");
  useKoviEyes(box);
  const tip = SAMPLE[index % SAMPLE.length];

  function next() {
    setIndex((value) => value + 1);
    setMood((value) => (value === "happy" ? "thinking" : "happy"));
    const svg = box.current?.querySelector("svg");
    if (svg) {
      svg.removeAttribute("data-hop");
      void svg.getBoundingClientRect();
      svg.setAttribute("data-hop", "");
    }
  }

  return (
    <section aria-labelledby="conoce-a-kovi" className="container-page">
      <div className="relative grid items-center gap-8 overflow-hidden rounded-3xl border bg-card p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] md:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 size-96 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--lime)_30%,transparent),transparent_65%)] blur-2xl"
        />
        <div className="relative grid gap-5">
          <p className="text-eyebrow text-primary">Tu asistente</p>
          <h2
            id="conoce-a-kovi"
            className="text-4xl leading-[1.05] font-black font-stretch-118% md:text-5xl"
          >
            Hola, soy Kovi
          </h2>
          <p className="max-w-lg text-lg text-muted-foreground">
            Te acompaño mientras compras. Me encuentras abajo a la izquierda en toda la tienda:
            tócame cuando quieras un consejo.
          </p>
          <ul className="grid gap-3 sm:grid-cols-3">
            {SKILLS.map(({ Icon, title, text }) => (
              <li
                key={title}
                className="grid content-start gap-1.5 rounded-2xl border bg-background/60 p-3"
              >
                <Icon className="size-5 text-primary" aria-hidden />
                <span className="text-sm font-semibold">{title}</span>
                <span className="text-xs text-muted-foreground">{text}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/arma-tu-pc"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-glow transition-transform duration-200 hover:-translate-y-0.5"
            >
              Armar mi PC con Kovi
              <ArrowRightIcon className="size-4" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={next}
              className="inline-flex h-11 items-center rounded-xl border px-5 font-semibold transition-colors hover:border-primary/50"
            >
              Otro consejo
            </button>
          </div>
        </div>

        <div className="relative grid justify-items-center gap-4">
          {tip && (
            <p
              key={index}
              role="status"
              aria-live="polite"
              className="mascot-bubble-in relative w-full max-w-sm rounded-2xl border bg-background p-4 text-sm shadow-raised"
            >
              <span className="block font-mono text-[0.6875rem] font-semibold tracking-wide text-primary">
                Kovi · {tip.title}
              </span>
              <span className="mt-1 block leading-snug">{tip.text}</span>
              <span
                aria-hidden
                className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 border-r border-b bg-background"
              />
            </p>
          )}
          <button
            ref={box}
            type="button"
            onClick={next}
            aria-label="Pedirle otro consejo a Kovi"
            className="w-40 rounded-3xl outline-none focus-visible:ring-3 focus-visible:ring-ring/40 md:w-52"
          >
            <Kovi mood={mood} className="w-full" />
          </button>
        </div>
      </div>
    </section>
  );
}
