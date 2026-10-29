"use client";

import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  FileUpIcon,
  PencilLineIcon,
  PlusCircleIcon,
  RotateCcwIcon,
  UploadCloudIcon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { ModuleTile, type TileTone } from "@/components/admin/module-tile";
import { Button } from "@/components/ui/button";
import {
  applyProductImport,
  previewProductImport,
  type AppliedRow,
  type PreviewRow,
} from "@/features/admin/import/actions";
import {
  APPLY_CHUNK,
  MAX_IMPORT_ROWS,
  readProductSheet,
  type RawProductRow,
} from "@/features/admin/import/parse";
import type { ImportAction } from "@/features/admin/import/plan";
import { cn } from "@/lib/utils";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const ACTION_META: Record<
  ImportAction,
  { label: string; plural: string; tone: TileTone; Icon: typeof PlusCircleIcon }
> = {
  create: { label: "Nuevo", plural: "Nuevos", tone: "green", Icon: PlusCircleIcon },
  update: { label: "Cambia", plural: "Se actualizan", tone: "blue", Icon: PencilLineIcon },
  unchanged: { label: "Igual", plural: "Sin cambios", tone: "slate", Icon: CircleDashedIcon },
  error: { label: "Error", plural: "Con errores", tone: "red", Icon: XCircleIcon },
};
const ORDER: ImportAction[] = ["create", "update", "error", "unchanged"];

type Step =
  | { name: "idle" }
  | { name: "checking"; file: string }
  | {
      name: "preview";
      file: string;
      rows: RawProductRow[];
      preview: PreviewRow[];
      unknownHeaders: string[];
    }
  | { name: "applying"; file: string; done: number; total: number }
  | { name: "done"; file: string; results: AppliedRow[] };

/** Excel en Windows guarda «CSV» en Windows-1252: si UTF-8 no cuadra, se lee así. */
async function readText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  return utf8.includes("�") ? new TextDecoder("windows-1252").decode(buffer) : utf8;
}

/** Subir un CSV, ver qué pasaría con cada fila y aplicarlo en tandas. */
export function ImportWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: "idle" });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  async function check(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      toast.error("El archivo pesa más de 5 MB.");
      return;
    }
    setStep({ name: "checking", file: file.name });
    const sheet = readProductSheet(await readText(file));
    if (!sheet.hasSku) {
      toast.error("No encontré la columna SKU. Usa la plantilla o un archivo exportado.");
      setStep({ name: "idle" });
      return;
    }
    if (!sheet.rows.length) {
      toast.error("El archivo no tiene filas con productos.");
      setStep({ name: "idle" });
      return;
    }
    if (sheet.rows.length > MAX_IMPORT_ROWS) {
      toast.error(`Tiene ${sheet.rows.length} filas: el máximo es ${MAX_IMPORT_ROWS} por archivo.`);
      setStep({ name: "idle" });
      return;
    }
    const result = await previewProductImport({ rows: sheet.rows });
    if (!result.ok) {
      toast.error(result.error.message);
      setStep({ name: "idle" });
      return;
    }
    setStep({
      name: "preview",
      file: file.name,
      rows: sheet.rows,
      preview: result.data.rows,
      unknownHeaders: sheet.unknownHeaders,
    });
  }

  async function apply(rows: RawProductRow[], preview: PreviewRow[], file: string) {
    const wanted = new Set(
      preview
        .filter((row) => row.action === "create" || row.action === "update")
        .map((row) => row.line),
    );
    const pending = rows.filter((row) => wanted.has(row.line));
    const results: AppliedRow[] = [];
    setStep({ name: "applying", file, done: 0, total: pending.length });
    for (let start = 0; start < pending.length; start += APPLY_CHUNK) {
      const chunk = pending.slice(start, start + APPLY_CHUNK);
      const result = await applyProductImport({ rows: chunk });
      if (result.ok) results.push(...result.data.results);
      else {
        results.push(
          ...chunk.map((row) => ({
            line: row.line,
            sku: row.fields.sku ?? "",
            action: "error" as const,
            ok: false,
            message: result.error.message,
          })),
        );
      }
      setStep({ name: "applying", file, done: start + chunk.length, total: pending.length });
    }
    setStep({ name: "done", file, results });
    router.refresh();
  }

  function reset() {
    setStep({ name: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  if (step.name === "applying") {
    const percent = step.total ? Math.round((step.done / step.total) * 100) : 100;
    return (
      <section aria-live="polite" className="grid gap-4 rounded-2xl border bg-card p-6">
        <p className="font-semibold">Importando {step.file}…</p>
        <div
          role="progressbar"
          aria-label="Avance de la importación"
          aria-valuemin={0}
          aria-valuemax={step.total}
          aria-valuenow={step.done}
          className="h-2.5 overflow-hidden rounded-full bg-secondary"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out-soft"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {step.done} de {step.total} productos · no cierres esta página.
        </p>
      </section>
    );
  }

  if (step.name === "done") {
    const created = step.results.filter((row) => row.ok && row.action === "create").length;
    const updated = step.results.filter((row) => row.ok && row.action === "update").length;
    const failed = step.results.filter((row) => !row.ok);
    return (
      <section aria-live="polite" className="grid gap-5 rounded-2xl border bg-card p-6">
        <div className="flex items-center gap-3">
          <ModuleTile
            tone={failed.length ? "amber" : "green"}
            Icon={failed.length ? AlertTriangleIcon : CheckCircle2Icon}
            className="size-11 rounded-xl"
          />
          <div className="grid gap-0.5">
            <h2 className="text-lg font-bold">
              {failed.length ? "Importación terminada con avisos" : "Importación lista"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {created} {created === 1 ? "creado" : "creados"} · {updated}{" "}
              {updated === 1 ? "actualizado" : "actualizados"}
              {failed.length ? ` · ${failed.length} no se pudieron importar` : ""}
            </p>
          </div>
        </div>
        {failed.length > 0 && (
          <ul className="grid gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
            {failed.map((row) => (
              <li key={row.line}>
                <span className="font-mono text-xs text-muted-foreground">Línea {row.line}</span>{" "}
                <strong>{row.sku}</strong>: {row.message ?? "No se pudo importar."}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/admin/productos">Ver productos</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/admin/productos/calidad">Revisar la calidad del catálogo</Link>
          </Button>
          <Button type="button" variant="ghost" onClick={reset}>
            <RotateCcwIcon aria-hidden />
            Importar otro archivo
          </Button>
        </div>
      </section>
    );
  }

  if (step.name === "preview") {
    return (
      <ImportPreview
        file={step.file}
        preview={step.preview}
        unknownHeaders={step.unknownHeaders}
        onReset={reset}
        onApply={() => void apply(step.rows, step.preview, step.file)}
      />
    );
  }

  return (
    <label
      htmlFor={`${id}-file`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) void check(file);
      }}
      className={cn(
        "grid cursor-pointer justify-items-center gap-3 rounded-2xl border-2 border-dashed bg-card px-6 py-14 text-center transition-colors",
        dragging ? "border-primary bg-primary-soft" : "hover:border-primary/50",
        step.name === "checking" && "pointer-events-none opacity-70",
      )}
    >
      <ModuleTile tone="blue" Icon={FileUpIcon} className="size-14 rounded-2xl" />
      <span className="text-base font-semibold">
        {step.name === "checking"
          ? `Revisando ${step.file}…`
          : "Arrastra aquí tu archivo CSV o haz clic para elegirlo"}
      </span>
      <span className="text-sm text-muted-foreground">
        Primero verás qué se crea y qué cambia; nada se guarda sin tu confirmación.
      </span>
      <input
        ref={inputRef}
        id={`${id}-file`}
        type="file"
        accept=".csv,text/csv,text/plain"
        className="sr-only"
        disabled={step.name === "checking"}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void check(file);
        }}
      />
    </label>
  );
}

/** Qué pasaría con cada fila: totales que filtran, avisos y el detalle por línea. */
export function ImportPreview({
  file,
  preview,
  unknownHeaders,
  onReset,
  onApply,
}: {
  file: string;
  preview: PreviewRow[];
  unknownHeaders: string[];
  onReset: () => void;
  onApply: () => void;
}) {
  const [filter, setFilter] = useState<ImportAction | "all">("all");
  const id = useId();
  const counts = Object.fromEntries(
    ORDER.map((action) => [action, preview.filter((row) => row.action === action).length]),
  ) as Record<ImportAction, number>;
  const toApply = counts.create + counts.update;
  const shown = preview.filter((row) => filter === "all" || row.action === filter);
  return (
    <section aria-labelledby={`${id}-preview`} className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-0.5">
          <h2 id={`${id}-preview`} className="text-lg font-bold">
            Vista previa de {file}
          </h2>
          <p className="text-sm text-muted-foreground">
            Nada ha cambiado todavía. Revisa y confirma.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={onReset}>
            Elegir otro archivo
          </Button>
          <Button type="button" disabled={!toApply} onClick={onApply}>
            <UploadCloudIcon aria-hidden />
            {toApply
              ? `Importar ${toApply} ${toApply === 1 ? "producto" : "productos"}`
              : "Nada para importar"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ORDER.map((action) => {
          const meta = ACTION_META[action];
          const active = filter === action;
          return (
            <button
              key={action}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(active ? "all" : action)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border bg-card p-4 text-left transition-[border-color,translate] duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                active && "border-primary/60",
              )}
            >
              <ModuleTile tone={meta.tone} Icon={meta.Icon} className="size-10 rounded-xl" />
              <span className="grid">
                <strong className="font-heading text-2xl font-bold tabular-nums">
                  {counts[action]}
                </strong>
                <span className="text-xs text-muted-foreground">{meta.plural}</span>
              </span>
            </button>
          );
        })}
      </div>

      {counts.error > 0 && (
        <p className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/5 p-3 text-sm">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          Las filas con errores no se importan. Corrígelas en el archivo y vuelve a subirlo; las
          demás se pueden importar ya.
        </p>
      )}
      {unknownHeaders.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Columnas que no reconocí y se ignoran: {unknownHeaders.join(", ")}.
        </p>
      )}

      <ul className="grid divide-y rounded-2xl border bg-card">
        {shown.map((row) => {
          const meta = ACTION_META[row.action];
          return (
            <li key={row.line} className="grid gap-1.5 p-4 sm:grid-cols-[6rem_minmax(0,1fr)]">
              <span className="flex items-center gap-2 sm:flex-col sm:items-start">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                    row.action === "create" && "bg-success/10 text-success",
                    row.action === "update" && "bg-primary-soft text-primary",
                    row.action === "unchanged" && "bg-secondary text-muted-foreground",
                    row.action === "error" && "bg-destructive/10 text-destructive",
                  )}
                >
                  <meta.Icon className="size-3.5" aria-hidden />
                  {meta.label}
                </span>
                <span className="font-mono text-xs text-muted-foreground">Línea {row.line}</span>
              </span>
              <div className="grid min-w-0 gap-1">
                <p className="truncate text-sm">
                  <strong>{row.name || "Sin nombre"}</strong>{" "}
                  <span className="font-mono text-xs text-muted-foreground">{row.sku}</span>
                </p>
                {row.changes.length > 0 && (
                  <p className="flex flex-wrap gap-1">
                    {row.changes.map((change) => (
                      <span
                        key={change}
                        className="rounded-md bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground"
                      >
                        {change}
                      </span>
                    ))}
                  </p>
                )}
                {row.errors.map((error) => (
                  <p key={error} className="text-sm text-destructive">
                    {error}
                  </p>
                ))}
                {row.warnings.map((warning) => (
                  <p key={warning} className="text-xs text-warning">
                    {warning}
                  </p>
                ))}
              </div>
            </li>
          );
        })}
        {!shown.length && (
          <li className="p-6 text-center text-sm text-muted-foreground">
            No hay filas en este grupo.
          </li>
        )}
      </ul>
    </section>
  );
}
