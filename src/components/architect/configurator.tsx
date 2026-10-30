"use client";

import { FlaskConicalIcon, ScaleIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { siteConfig } from "@/config/site";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  budgetUsage,
  cartLines,
  choosePart,
  indexParts,
  removePart,
  selectedParts,
  selectionTotal,
  toBuild,
} from "@/features/architect/build";
import { saveBuild } from "@/features/architect/actions";
import type { GuidedAnswers } from "@/features/architect/guided";
import { buildPayload, quoteMessage } from "@/features/architect/saved";
import { savedBuildsActions } from "@/features/architect/saved-store";
import { EMPTY_SELECTION, type ArchitectPart, type Selection } from "@/features/architect/types";
import { whatsappLink } from "@/features/store-settings/types";
import { useCart } from "@/features/cart/store";
import { checkBuild, overallStatus } from "@/features/compatibility/engine";
import { estimatePower } from "@/features/compatibility/rules";
import { STATUS_LABELS, type PartKind } from "@/features/compatibility/types";
import { formatCOP } from "@/lib/format";
import { cn } from "@/lib/utils";
import { buildPricing } from "@/features/offers/compare";
import { BuildSummary } from "./build-summary";
import { CompareSheet } from "./compare-sheet";
import { GuidedWizard } from "./guided-wizard";
import { MyBuildsButton } from "./my-builds-sheet";
import { ShareSheet, type SavedLink } from "./share-sheet";
import { PartPicker } from "./part-picker";
import { SlotList } from "./slot-list";
import { StatusDot } from "./status";
import { WhereToBuySheet } from "./where-to-buy-sheet";

type Source = "catalog" | "demo";
type Mode = "guided" | "free";

/** Estado con el que abre: desde un enlace guardado o desde la ficha de un producto. */
export type ConfiguratorInitial = {
  mode: Mode;
  source: Source;
  selection: Selection;
  active: PartKind;
  budget: number | null;
  /** Configuración de la que parte (guardar crea una versión nueva de ella). */
  parent: { code: string; name: string } | null;
};

/** Enlace con el dominio donde se abrió la página (producción o una vista previa). */
const linkTo = (code: string) => new URL(`/arma-tu-pc/${code}`, window.location.origin).toString();

export const piecesLabel = (count: number) => `${count} ${count === 1 ? "pieza" : "piezas"}`;

/**
 * Kova Architect en modo libre: piezas, opciones y resumen. Funciona con el
 * catálogo real o con piezas demo (ficticias, no comprables) cuando el catálogo
 * todavía no tiene productos con ficha.
 */
export function Configurator({
  catalogParts,
  demoParts,
  whatsappNumber,
  usdRate,
  initial,
}: {
  catalogParts: ArchitectPart[];
  demoParts: ArchitectPart[];
  whatsappNumber: string | null;
  usdRate: number | null;
  initial?: ConfiguratorInitial;
}) {
  const router = useRouter();
  const { items, add } = useCart();
  const [mode, setMode] = useState<Mode>(initial?.mode ?? "guided");
  const [source, setSource] = useState<Source>(
    initial?.source ?? (catalogParts.length ? "catalog" : "demo"),
  );
  const [selection, setSelection] = useState<Selection>(initial?.selection ?? EMPTY_SELECTION);
  const [active, setActive] = useState<PartKind>(initial?.active ?? "cpu");
  const [budget, setBudget] = useState<number | null>(initial?.budget ?? null);
  const [answers, setAnswers] = useState<GuidedAnswers | null>(null);
  const [share, setShare] = useState<"share" | "quote" | null>(null);
  // Lo último guardado y con qué estado, para saber si hay cambios sin guardar.
  const [saved, setSaved] = useState<(SavedLink & { signature: string }) | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [whereOpen, setWhereOpen] = useState(false);

  const parts = source === "catalog" ? catalogParts : demoParts;
  const index = useMemo(() => indexParts(parts), [parts]);
  const results = useMemo(() => checkBuild(toBuild(selection, index)), [selection, index]);
  const status = overallStatus(results);
  const total = selectionTotal(selection, index);
  const usage = budgetUsage(total, budget);
  const power = estimatePower(toBuild(selection, index));
  const chosenParts = selectedParts(selection, index);
  const count = chosenParts.length;
  // Solo vale la pena comparar si alguna pieza tiene ofertas afuera o no se vende aquí.
  const pricing = chosenParts.some((part) => part.offers.length || part.reference)
    ? buildPricing(chosenParts, usdRate)
    : null;
  const lines = cartLines(selection, index);
  const available = lines.filter(({ part }) => (part.stock ?? 0) > 0);

  const cart: { ready: true } | { ready: false; reason: string } =
    source === "demo"
      ? { ready: false, reason: "Las piezas demo son de ejemplo y no se pueden comprar." }
      : !lines.length
        ? {
            ready: false,
            reason: count
              ? "Las piezas elegidas son de referencia: no se venden aquí. Mira dónde conseguirlas."
              : "Elige piezas para agregarlas al carrito.",
          }
        : !available.length
          ? { ready: false, reason: "Las piezas elegidas están agotadas." }
          : { ready: true };

  const signature = JSON.stringify({ selection, budget, source });
  const current = saved?.signature === signature ? saved : null;
  const shareName = saved?.name ?? initial?.parent?.name ?? "Mi PC";

  async function save(name: string): Promise<{ ok: true } | { ok: false; message: string }> {
    const result = await saveBuild(
      buildPayload(selection, index, {
        name,
        mode: answers ? "guided" : "free",
        source,
        budget,
        answers,
        parent_code: saved?.code ?? initial?.parent?.code ?? null,
      }),
    );
    if (!result.ok) {
      return {
        ok: false,
        message: result.error.fieldErrors?.name?.[0] ?? result.error.message,
      };
    }
    const link = { code: result.data.code, name: name.trim(), url: linkTo(result.data.code) };
    setSaved({ ...link, signature });
    savedBuildsActions.add({
      code: link.code,
      name: link.name,
      total,
      savedAt: new Date().toISOString(),
    });
    return { ok: true };
  }

  const quoteHref =
    current && whatsappNumber
      ? whatsappLink(
          whatsappNumber,
          quoteMessage({
            storeName: siteConfig.name,
            name: current.name,
            selection,
            index,
            url: current.url,
          }),
        )
      : null;
  const shareHref = current
    ? `https://wa.me/?text=${encodeURIComponent(`Mira el PC que armé en ${siteConfig.name}: ${current.url}`)}`
    : null;

  function switchSource(next: Source) {
    if (next === source) return;
    setSource(next);
    setSelection(EMPTY_SELECTION);
    setCompare([]);
  }

  function choose(part: ArchitectPart) {
    setSelection((current) => choosePart(current, part));
    setCompareOpen(false);
  }

  function selectKind(kind: PartKind) {
    setActive(kind);
    setCompare([]);
  }

  function toggleCompare(part: ArchitectPart) {
    setCompare((current) =>
      current.includes(part.id)
        ? current.filter((id) => id !== part.id)
        : [...current, part.id].slice(-2),
    );
  }

  function addAllToCart() {
    let added = 0;
    for (const { part, quantity } of available) {
      const inCart = items.find((item) => item.productId === part.id)?.quantity ?? 0;
      const units = Math.min(quantity, Math.max(0, (part.stock ?? 0) - inCart));
      if (units <= 0) continue;
      add(part.id, units, part.stock ?? undefined);
      added += units;
    }
    const skipped = lines.length - available.length;
    if (!added) {
      toast.info("Ya tienes estas piezas en el carrito.");
      return;
    }
    toast.success(`${added} ${added === 1 ? "pieza agregada" : "piezas agregadas"} al carrito`, {
      description: skipped ? `${skipped} agotada(s) no se agregaron.` : undefined,
      action: { label: "Ver carrito", onClick: () => router.push("/carrito") },
    });
  }

  const comparing = compare.flatMap((id) => index.get(id) ?? []);
  const summary = (
    <BuildSummary
      total={total}
      budget={budget}
      usage={usage}
      onBudgetChange={setBudget}
      power={power}
      results={results}
      status={status}
      count={count}
      pricing={pricing}
      onWhereToBuy={() => {
        setSummaryOpen(false);
        setWhereOpen(true);
      }}
      cart={cart}
      onAddToCart={addAllToCart}
      onShare={() => {
        setSummaryOpen(false);
        setShare("share");
      }}
      onQuote={
        whatsappNumber
          ? () => {
              setSummaryOpen(false);
              setShare("quote");
            }
          : null
      }
      onReset={() => {
        setSelection(EMPTY_SELECTION);
        setCompare([]);
        setSummaryOpen(false);
      }}
    />
  );

  return (
    <div className={cn("grid gap-5", mode === "free" && "pb-24 xl:pb-0")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Modo"
            value={mode}
            onChange={setMode}
            options={[
              ["guided", "Guiado"],
              ["free", "Libre"],
            ]}
          />
          <div
            role="group"
            aria-label="Piezas"
            className="inline-flex rounded-xl border bg-card p-1"
          >
            {(
              [
                ["catalog", `Catálogo (${catalogParts.length})`],
                ["demo", "Piezas demo"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={source === value}
                disabled={value === "catalog" && !catalogParts.length}
                onClick={() => switchSource(value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  source === value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <MyBuildsButton />
        </div>
        {!catalogParts.length && (
          <p className="text-xs text-muted-foreground">
            El catálogo aún no tiene piezas con ficha para Architect.
          </p>
        )}
      </div>

      {source === "demo" && (
        <p className="flex items-start gap-2.5 rounded-xl border border-tech/40 bg-tech/10 p-3 text-sm">
          <FlaskConicalIcon className="mt-0.5 size-4 shrink-0 text-tech" aria-hidden />
          <span>
            <strong>Estás viendo piezas demo.</strong> Son ficticias, con precios de ejemplo, y no
            se pueden comprar. Sirven para probar cómo funciona el configurador.
          </span>
        </p>
      )}

      {mode === "guided" ? (
        <GuidedWizard
          key={source}
          parts={parts}
          onApply={(next, towerBudget, guidedAnswers) => {
            setAnswers(guidedAnswers);
            setSelection(next);
            setBudget(towerBudget);
            setCompare([]);
            setActive("cpu");
            setMode("free");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_21rem]">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <SlotList
                selection={selection}
                index={index}
                results={results}
                active={active}
                onSelect={selectKind}
              />
            </div>

            <div className="grid content-start gap-4">
              <PartPicker
                kind={active}
                parts={parts}
                selection={selection}
                index={index}
                compare={compare}
                rate={usdRate}
                onChoose={choose}
                onRemove={(kind, position) =>
                  setSelection((current) => removePart(current, kind, position))
                }
                onToggleCompare={toggleCompare}
              />
              {compare.length > 0 && (
                <div className="sticky bottom-24 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-popover/95 p-3 shadow-raised backdrop-blur xl:bottom-4">
                  <span className="text-sm">
                    {compare.length === 1
                      ? "Marca otra opción para comparar."
                      : `Comparar ${comparing.map((part) => part.name).join(" y ")}`}
                  </span>
                  <span className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setCompare([])}>
                      <XIcon aria-hidden />
                      Limpiar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={comparing.length < 2}
                      onClick={() => setCompareOpen(true)}
                    >
                      <ScaleIcon aria-hidden />
                      Comparar
                    </Button>
                  </span>
                </div>
              )}
            </div>

            <aside aria-label="Resumen del equipo" className="hidden xl:block">
              <div className="sticky top-24 rounded-2xl border bg-card p-5">{summary}</div>
            </aside>
          </div>

          {/* Celular y tablet: el resumen va en una barra fija y se abre como panel. */}
          <div
            data-architect-bar
            className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur xl:hidden"
          >
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
              <span className="grid gap-0.5">
                <span className="font-heading text-lg font-bold font-stretch-112% tabular-nums">
                  {formatCOP(total)}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <StatusDot status={status} />
                  {status ? STATUS_LABELS[status] : piecesLabel(count)}
                  {usage && ` · ${usage.percent} % del presupuesto`}
                </span>
              </span>
              <Button type="button" onClick={() => setSummaryOpen(true)}>
                Ver resumen
              </Button>
            </div>
          </div>
          <Sheet open={summaryOpen} onOpenChange={setSummaryOpen}>
            <SheetContent
              side="bottom"
              className="max-h-[88dvh] gap-0 overflow-y-auto rounded-t-2xl p-0"
              // Sin enfocar el presupuesto: en el celular abriría el teclado.
              onOpenAutoFocus={(event) => {
                event.preventDefault();
                (event.currentTarget as HTMLElement).focus();
              }}
            >
              <SheetHeader className="border-b p-5">
                <SheetTitle className="font-heading font-stretch-112%">
                  Resumen del equipo
                </SheetTitle>
                <SheetDescription>
                  Presupuesto, total y compatibilidad de tus piezas.
                </SheetDescription>
              </SheetHeader>
              <div className="p-5">{summary}</div>
            </SheetContent>
          </Sheet>

          <ShareSheet
            key={share ? `${share}-${current?.code ?? "nuevo"}` : "cerrado"}
            open={share !== null}
            onOpenChange={(open) => !open && setShare(null)}
            intent={share ?? "share"}
            saved={current}
            defaultName={shareName}
            onSave={save}
            quoteHref={quoteHref}
            shareHref={shareHref}
          />

          <WhereToBuySheet
            parts={chosenParts}
            rate={usdRate}
            open={whereOpen}
            onOpenChange={setWhereOpen}
          />
          <CompareSheet
            parts={
              comparing.length === 2
                ? ([comparing[0], comparing[1]] as [ArchitectPart, ArchitectPart])
                : null
            }
            open={compareOpen}
            onOpenChange={setCompareOpen}
            onChoose={choose}
          />
        </>
      )}
    </div>
  );
}

/** Botones de opción única (modo, origen de las piezas). */
function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: [T, string][];
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-xl border bg-card p-1">
      {options.map(([option, text]) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
            value === option
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
