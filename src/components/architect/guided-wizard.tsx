"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BriefcaseIcon,
  ClapperboardIcon,
  Gamepad2Icon,
  GraduationCapIcon,
  InfoIcon,
  LayersIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { indexParts, selectionTotal, toBuild } from "@/features/architect/build";
import {
  DEFAULT_ANSWERS,
  recommendBuild,
  swapPick,
  USE_LABELS,
  type GuidedAnswers,
  type GuidedResult,
  type Use,
} from "@/features/architect/guided";
import type { ArchitectPart, Selection } from "@/features/architect/types";
import { checkBuild, overallStatus } from "@/features/compatibility/engine";
import { PART_LABELS } from "@/features/compatibility/types";
import { formatCOP } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PartThumb } from "./part-thumb";
import { StatusLabel } from "./status";

type Option<T extends string> = { value: T; label: string; hint?: string; Icon?: LucideIcon };

const USE_OPTIONS: Option<Use>[] = [
  { value: "gaming", label: USE_LABELS.gaming, hint: "Juegos actuales", Icon: Gamepad2Icon },
  {
    value: "work",
    label: USE_LABELS.work,
    hint: "Oficina, navegador, reuniones",
    Icon: BriefcaseIcon,
  },
  {
    value: "study",
    label: USE_LABELS.study,
    hint: "Clases, documentos, programación",
    Icon: GraduationCapIcon,
  },
  {
    value: "editing",
    label: USE_LABELS.editing,
    hint: "Diseño, video, 3D",
    Icon: ClapperboardIcon,
  },
  { value: "all", label: USE_LABELS.all, hint: "Jugar y trabajar", Icon: LayersIcon },
];

const BUDGET = { min: 2_000_000, max: 25_000_000, step: 100_000 };

type Step = {
  key: keyof GuidedAnswers;
  title: string;
  /** Solo se pregunta si aplica a las respuestas anteriores. */
  when?: (answers: GuidedAnswers) => boolean;
  options?: Option<string>[];
};

const STEPS: Step[] = [
  { key: "use", title: "¿Para qué lo vas a usar?", options: USE_OPTIONS },
  { key: "budget", title: "¿Cuánto quieres invertir?" },
  {
    key: "resolution",
    title: "¿En qué resolución vas a jugar?",
    when: (answers) => answers.use === "gaming" || answers.use === "all",
    options: [
      { value: "1080p", label: "1080p", hint: "Full HD, el más común" },
      { value: "1440p", label: "1440p", hint: "QHD, más detalle" },
      { value: "4k", label: "4K", hint: "Lo más exigente para la gráfica" },
    ],
  },
  {
    key: "brand",
    title: "¿Tienes marca preferida?",
    options: [
      { value: "any", label: "Me da igual", hint: "Elegimos lo mejor que encaje" },
      { value: "amd", label: "AMD", hint: "Procesador y gráfica" },
      { value: "intel", label: "Intel", hint: "Procesador" },
      { value: "nvidia", label: "NVIDIA", hint: "Tarjeta gráfica" },
    ],
  },
  {
    key: "priority",
    title: "¿Qué priorizas?",
    options: [
      { value: "performance", label: "Rendimiento", hint: "Todo a las piezas que más rinden" },
      { value: "balanced", label: "Equilibrio", hint: "Un poco de todo" },
      { value: "looks", label: "Estética", hint: "Gabinete y refrigeración más vistosos" },
    ],
  },
  {
    key: "extras",
    title: "¿Necesitas monitor o periféricos?",
    options: [
      { value: "none", label: "No, solo la torre", hint: "Todo el presupuesto al equipo" },
      { value: "monitor", label: "Monitor", hint: "Apartamos un 15 %" },
      { value: "monitor-peripherals", label: "Monitor y periféricos", hint: "Apartamos un 22 %" },
    ],
  },
];

/**
 * Modo guiado: seis preguntas y una recomendación explicada, con alternativas
 * más económicas y mejores. El resultado se ajusta luego en el modo libre.
 */
export function GuidedWizard({
  parts,
  onApply,
}: {
  parts: ArchitectPart[];
  onApply: (selection: Selection, budget: number, answers: GuidedAnswers) => void;
}) {
  const [answers, setAnswers] = useState<GuidedAnswers>(DEFAULT_ANSWERS);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<{ base: GuidedResult; selection: Selection } | null>(null);

  const steps = STEPS.filter((item) => !item.when || item.when(answers));
  const current = steps[Math.min(step, steps.length - 1)] as Step;
  const last = step >= steps.length - 1;

  if (result) {
    return (
      <GuidedResultView
        answers={answers}
        parts={parts}
        result={result.base}
        selection={result.selection}
        onSwap={(part) =>
          setResult((value) => value && { ...value, selection: swapPick(value.selection, part) })
        }
        onBack={() => setResult(null)}
        onApply={() => onApply(result.selection, result.base.towerBudget, answers)}
      />
    );
  }

  function finish() {
    const base = recommendBuild(answers, parts);
    setResult({ base, selection: base.selection });
  }

  return (
    <section aria-labelledby="guided-step" className="mx-auto grid w-full max-w-3xl gap-6">
      <div className="grid gap-2">
        <p className="text-eyebrow text-muted-foreground">
          Pregunta {step + 1} de {steps.length}
        </p>
        <div
          role="progressbar"
          aria-label="Avance de las preguntas"
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={step + 1}
          className="h-1.5 overflow-hidden rounded-full bg-secondary"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out-soft"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <fieldset className="grid gap-4">
        <legend id="guided-step" className="mb-4 text-2xl font-bold md:text-3xl">
          {current.title}
        </legend>
        {current.key === "budget" ? (
          <BudgetQuestion
            value={answers.budget}
            onChange={(budget) => setAnswers((value) => ({ ...value, budget }))}
          />
        ) : (
          <ChoiceGroup
            name={current.key}
            options={current.options ?? []}
            value={String(answers[current.key])}
            onChange={(choice) => setAnswers((value) => ({ ...value, [current.key]: choice }))}
          />
        )}
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          disabled={step === 0}
          onClick={() => setStep((value) => Math.max(0, value - 1))}
        >
          <ArrowLeftIcon aria-hidden />
          Atrás
        </Button>
        <Button type="button" size="lg" onClick={last ? finish : () => setStep(step + 1)}>
          {last ? "Ver mi recomendación" : "Siguiente"}
          <ArrowRightIcon aria-hidden />
        </Button>
      </div>
    </section>
  );
}

function ChoiceGroup({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: Option<string>[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40",
            value === option.value && "border-primary bg-primary-soft",
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.Icon && (
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
              <option.Icon className="size-5" aria-hidden />
            </span>
          )}
          <span className="grid gap-0.5">
            <span className="font-semibold">{option.label}</span>
            {option.hint && <span className="text-sm text-muted-foreground">{option.hint}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}

function BudgetQuestion({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const id = useId();
  return (
    <div className="grid gap-4 rounded-xl border bg-card p-5">
      <output
        htmlFor={`${id}-range`}
        className="font-heading text-4xl font-extrabold font-stretch-112% tabular-nums"
      >
        {formatCOP(value)}
      </output>
      <label htmlFor={`${id}-range`} className="sr-only">
        Presupuesto
      </label>
      <input
        id={`${id}-range`}
        type="range"
        min={BUDGET.min}
        max={BUDGET.max}
        step={BUDGET.step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-valuetext={formatCOP(value)}
        className="w-full accent-primary"
      />
      <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
        <span>{formatCOP(BUDGET.min)}</span>
        <span>{formatCOP(BUDGET.max)}</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Es el total para todo lo que vas a comprar. Puedes cambiarlo después en el resumen.
      </p>
    </div>
  );
}

function GuidedResultView({
  answers,
  parts,
  result,
  selection,
  onSwap,
  onBack,
  onApply,
}: {
  answers: GuidedAnswers;
  parts: ArchitectPart[];
  result: GuidedResult;
  selection: Selection;
  onSwap: (part: ArchitectPart) => void;
  onBack: () => void;
  onApply: () => void;
}) {
  const index = useMemo(() => indexParts(parts), [parts]);
  const results = useMemo(() => checkBuild(toBuild(selection, index)), [selection, index]);
  const status = overallStatus(results);
  const total = selectionTotal(selection, index);
  const chosen = (kind: string) =>
    kind === "storage" ? selection.storage[0] : selection.parts[kind as keyof Selection["parts"]];

  return (
    <section aria-labelledby="guided-result" className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <p className="text-eyebrow text-muted-foreground">
            {USE_LABELS[answers.use]} · presupuesto {formatCOP(answers.budget)}
          </p>
          <h2 id="guided-result" className="text-2xl font-bold md:text-3xl">
            Tu equipo recomendado
          </h2>
        </div>
        <div className="grid justify-items-end gap-1">
          <span className="font-heading text-3xl font-extrabold font-stretch-112% tabular-nums">
            {formatCOP(total)}
          </span>
          {status === "unknown" ? (
            <span className="text-xs text-muted-foreground">
              Sin incompatibilidades · hay datos por confirmar en el modo libre
            </span>
          ) : (
            status && <StatusLabel status={status} />
          )}
        </div>
      </div>

      {(result.notes.length > 0 || result.missing.length > 0) && (
        <ul className="grid gap-2">
          {result.missing.length > 0 && (
            <li className="flex gap-2.5 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
              <InfoIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              No hay{" "}
              {result.missing
                .map((kind) => PART_LABELS[kind].toLocaleLowerCase("es-CO"))
                .join(", ")}{" "}
              con ficha que encaje en el catálogo. Elígelas en el modo libre o cambia a piezas demo.
            </li>
          )}
          {result.notes.map((note) => (
            <li key={note} className="flex gap-2.5 rounded-xl border bg-card p-3 text-sm">
              <InfoIcon className="mt-0.5 size-4 shrink-0 text-tech" aria-hidden />
              {note}
            </li>
          ))}
        </ul>
      )}

      <ul className="grid gap-3">
        {result.picks.map((pick) => {
          const part = index.get(chosen(pick.kind) ?? "") ?? pick.part;
          const swapped = part.id !== pick.part.id;
          const alternatives = [
            { label: "Más económica", option: pick.cheaper },
            { label: "Mejor", option: pick.better },
            ...(swapped ? [{ label: "Recomendada", option: pick.part }] : []),
          ].filter(
            (item): item is { label: string; option: ArchitectPart } =>
              item.option !== null && item.option.id !== part.id,
          );
          return (
            <li key={pick.kind}>
              <article
                aria-label={`${PART_LABELS[pick.kind]}: ${part.name}`}
                className="grid gap-3 rounded-xl border bg-card p-4"
              >
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                  <PartThumb part={part} />
                  <span className="grid min-w-0 gap-0.5">
                    <span className="text-eyebrow text-muted-foreground">
                      {PART_LABELS[pick.kind]}
                    </span>
                    <span className="font-semibold">{part.name}</span>
                  </span>
                  <span className="font-heading text-base font-bold font-stretch-112% tabular-nums">
                    {formatCOP(part.price)}
                  </span>
                </div>
                {!swapped && <p className="text-sm text-muted-foreground">{pick.reason}</p>}
                {alternatives.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {alternatives.map(({ label, option }) => {
                      const diff = option.price - part.price;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => onSwap(option)}
                          className="grid gap-0.5 rounded-lg border bg-background px-3 py-2 text-left text-xs transition-colors hover:border-primary/50"
                        >
                          <span className="text-muted-foreground">
                            {label} · {diff > 0 ? "+" : "−"}
                            {formatCOP(Math.abs(diff))}
                          </span>
                          <span className="font-medium">Usar {option.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </article>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted-foreground">
        Las elecciones salen de la ficha técnica de cada pieza: no estimamos FPS ni rendimiento que
        los datos no respalden.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeftIcon aria-hidden />
          Cambiar respuestas
        </Button>
        <Button type="button" size="lg" onClick={onApply} disabled={!result.picks.length}>
          <SlidersHorizontalIcon aria-hidden />
          Ajustar en modo libre
        </Button>
      </div>
    </section>
  );
}
