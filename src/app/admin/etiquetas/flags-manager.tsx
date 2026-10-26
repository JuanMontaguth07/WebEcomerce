"use client";

import { CpuIcon, ImagePlusIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdminEmpty } from "@/components/admin/admin-ui";
import { CheckboxField, TextField } from "@/components/admin/form-helpers";
import { ProductFlagTag } from "@/components/shop/product-flag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteFlag, saveFlag } from "@/features/flags/actions";
import type { AdminFlag } from "@/features/flags/queries";
import { flagContrast } from "@/features/flags/types";
import { CATALOG_BUCKET } from "@/lib/images";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Errors = Partial<Record<string, string[]>>;
type Draft = {
  id?: string;
  name: string;
  color: string;
  logoPath: string | null;
  showName: boolean;
  isActive: boolean;
};

const ACCEPTED: Record<string, string> = {
  "image/png": "png",
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/avif": "avif",
};
const MAX_BYTES = 512 * 1024;

/** Colores habituales de marcas de hardware, como punto de partida. */
const SWATCHES = [
  { color: "#76B900", label: "Verde (tipo NVIDIA)" },
  { color: "#ED1C24", label: "Rojo (tipo AMD)" },
  { color: "#0071C5", label: "Azul (tipo Intel)" },
  { color: "#111111", label: "Negro" },
  { color: "#F97316", label: "Naranja" },
  { color: "#7C3AED", label: "Morado" },
];

/** Tarjeta de muestra con la bandera, como se ve en la tienda. */
function FlagPreview({ draft, logoSrc }: { draft: Draft; logoSrc: string | null }) {
  return (
    <div
      role="img"
      aria-label={`Vista previa de la etiqueta ${draft.name || "sin nombre"} en una tarjeta`}
      className="group relative w-full max-w-56 overflow-hidden rounded-xl border bg-card"
    >
      <div className="relative grid aspect-[4/3] place-items-center bg-secondary">
        <CpuIcon className="size-12 text-muted-foreground/60" aria-hidden />
        <ProductFlagTag
          flag={{ ...draft, name: draft.name || "Marca" }}
          logoSrc={logoSrc}
          className="product-flag-edge absolute bottom-3 left-0"
        />
      </div>
      <div className="grid gap-1.5 p-3">
        <span className="h-2 w-16 rounded-full bg-muted-foreground/25" />
        <span className="h-3 w-4/5 rounded-full bg-foreground/20" />
        <span className="mt-1 h-3.5 w-1/2 rounded-full bg-foreground/35" />
      </div>
    </div>
  );
}

export function FlagsManager({ flags }: { flags: AdminFlag[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Libera la URL temporal de la imagen elegida.
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  function open(next: Draft) {
    setErrors({});
    setFile(null);
    setPreview(null);
    setDraft(next);
    requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function pickFile(picked: File | undefined) {
    if (!picked) return;
    if (!ACCEPTED[picked.type]) {
      toast.error("Usa PNG (mejor con fondo transparente), WebP, JPG o AVIF.");
      return;
    }
    if (picked.size > MAX_BYTES) {
      toast.error("El logo pesa más de 500 KB. Usa uno más liviano.");
      return;
    }
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
    setErrors((current) => ({ ...current, showName: undefined }));
  }

  function removeLogo() {
    setFile(null);
    setPreview(null);
    set("logoPath", null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    startTransition(async () => {
      let logoPath = draft.logoPath;
      let uploaded: string | null = null;
      const supabase = createClient();

      if (file) {
        uploaded = `flags/${crypto.randomUUID()}.${ACCEPTED[file.type]}`;
        const { error } = await supabase.storage
          .from(CATALOG_BUCKET)
          .upload(uploaded, file, { contentType: file.type, cacheControl: "31536000" });
        if (error) {
          toast.error(`No se pudo subir el logo (${error.message}).`);
          return;
        }
        logoPath = uploaded;
      }

      const result = await saveFlag({ ...draft, logoPath });
      if (!result.ok) {
        if (uploaded) await supabase.storage.from(CATALOG_BUCKET).remove([uploaded]);
        setErrors(result.error.fieldErrors ?? {});
        toast.error(result.error.message);
        return;
      }
      toast.success(draft.id ? "Etiqueta actualizada en toda la tienda" : "Etiqueta creada");
      setDraft(null);
      setFile(null);
      setPreview(null);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteFlag({ id });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Etiqueta eliminada. Sus productos quedaron sin bandera.");
      setDeleting(null);
      router.refresh();
    });
  }

  const lowContrast = draft ? flagContrast(draft.color) < 4.5 : false;

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1fr_26rem]">
      <section aria-label="Etiquetas creadas" className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-prose text-sm text-muted-foreground">
            Una bandera con el color y el logo de la marca o línea (NVIDIA, AMD Ryzen, Intel Core…).
            Asígnala en cada producto o en lote desde la lista de productos.
          </p>
          <Button
            onClick={() =>
              open({
                name: "",
                color: SWATCHES[0]?.color ?? "#76B900",
                logoPath: null,
                showName: true,
                isActive: true,
              })
            }
          >
            <PlusIcon aria-hidden />
            Nueva etiqueta
          </Button>
        </div>

        {flags.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {flags.map((flag) => (
              <li
                key={flag.id}
                className={cn(
                  "grid gap-4 rounded-xl border bg-card p-4",
                  draft?.id === flag.id && "border-primary ring-3 ring-ring/20",
                )}
              >
                <div className="grid justify-items-start gap-3">
                  <ProductFlagTag flag={flag} size="lg" className="-ml-4" />
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold">{flag.name}</h3>
                    {!flag.isActive && <Badge variant="outline">Oculta</Badge>}
                    {!flag.logoPath && <Badge variant="outline">Sin logo</Badge>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                  <Link
                    href={`/admin/productos?etiqueta=${flag.id}`}
                    className="mr-auto text-sm font-semibold text-primary hover:underline"
                  >
                    {flag.productCount} {flag.productCount === 1 ? "producto" : "productos"}
                  </Link>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      open({
                        id: flag.id,
                        name: flag.name,
                        color: flag.color,
                        logoPath: flag.logoPath,
                        showName: flag.showName,
                        isActive: flag.isActive,
                      })
                    }
                  >
                    <PencilIcon aria-hidden />
                    Editar
                  </Button>
                  {deleting === flag.id ? (
                    <>
                      <Button
                        size="sm"
                        variant="destructive"
                        isLoading={pending}
                        onClick={() => remove(flag.id)}
                      >
                        Sí, eliminar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleting(null)}>
                        No
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Eliminar ${flag.name}`}
                      onClick={() => setDeleting(flag.id)}
                    >
                      <Trash2Icon aria-hidden />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <AdminEmpty>
            Aún no hay etiquetas. Crea una por cada marca o línea que quieras resaltar.
          </AdminEmpty>
        )}
      </section>

      {draft && (
        <form
          ref={formRef}
          onSubmit={save}
          noValidate
          aria-label={draft.id ? "Editar etiqueta" : "Nueva etiqueta"}
          className="grid scroll-mt-20 gap-5 rounded-xl border bg-card p-5"
        >
          <h2 className="text-lg font-bold">
            {draft.id ? `Editar «${draft.name}»` : "Nueva etiqueta"}
          </h2>

          <div className="grid justify-items-center rounded-xl border border-dashed bg-background p-5">
            <FlagPreview draft={draft} logoSrc={preview ?? null} />
          </div>

          <TextField
            name="name"
            label="Nombre"
            errors={errors}
            maxLength={40}
            placeholder="NVIDIA GeForce"
            value={draft.name}
            onChange={(event) => set("name", event.target.value)}
          />

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-semibold">Color de la marca</legend>
            <div className="flex flex-wrap items-center gap-2">
              {SWATCHES.map((swatch) => (
                <button
                  key={swatch.color}
                  type="button"
                  aria-label={swatch.label}
                  aria-pressed={draft.color.toUpperCase() === swatch.color}
                  onClick={() => set("color", swatch.color)}
                  className="size-8 rounded-full border-2 border-card ring-1 ring-border transition-transform hover:scale-110 aria-pressed:ring-3 aria-pressed:ring-foreground"
                  style={{ background: swatch.color }}
                />
              ))}
              <label className="flex items-center gap-2 rounded-lg border px-2 py-1 text-sm">
                <input
                  type="color"
                  value={draft.color}
                  onChange={(event) => set("color", event.target.value.toUpperCase())}
                  className="size-7 cursor-pointer rounded border-0 bg-transparent p-0"
                  aria-label="Elegir otro color"
                />
                <span className="font-mono text-xs">{draft.color.toUpperCase()}</span>
              </label>
            </div>
            {lowContrast && (
              <p className="text-sm text-warning">
                Con este color el nombre se lee con dificultad. Prueba un tono más oscuro o más
                claro, o muestra solo el logo.
              </p>
            )}
            {errors.color && <p className="text-sm text-destructive">{errors.color[0]}</p>}
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-semibold">
              Logo <span className="font-normal text-muted-foreground">(opcional)</span>
            </legend>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept={Object.keys(ACCEPTED).join(",")}
                className="sr-only"
                id="flag-logo"
                onChange={(event) => pickFile(event.target.files?.[0])}
              />
              <Button asChild variant="secondary" size="sm">
                <label htmlFor="flag-logo" className="cursor-pointer">
                  <ImagePlusIcon aria-hidden />
                  {draft.logoPath || file ? "Cambiar logo" : "Subir logo"}
                </label>
              </Button>
              {(draft.logoPath || file) && (
                <Button type="button" variant="ghost" size="sm" onClick={removeLogo}>
                  <XIcon aria-hidden />
                  Quitar logo
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              PNG con fondo transparente, máximo 500 KB. Usa la versión del logo que se vea bien
              sobre el color elegido (por ejemplo, blanca sobre verde).
            </p>
          </fieldset>

          <CheckboxField
            name="showName"
            label="Mostrar el nombre junto al logo"
            hint="Apágalo si el logo ya dice la marca."
            checked={draft.showName}
            onCheckedChange={(checked) => set("showName", checked)}
          />
          {errors.showName && (
            <p className="-mt-3 text-sm text-destructive">{errors.showName[0]}</p>
          )}
          <CheckboxField
            name="isActive"
            label="Activa"
            hint="Si la apagas, sus productos se ven sin bandera."
            checked={draft.isActive}
            onCheckedChange={(checked) => set("isActive", checked)}
          />

          <div className="flex flex-wrap gap-2">
            <Button type="submit" isLoading={pending}>
              {draft.id ? "Guardar cambios" : "Crear etiqueta"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setDraft(null)} disabled={pending}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
