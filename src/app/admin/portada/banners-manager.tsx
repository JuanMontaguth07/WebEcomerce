"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ImagePlusIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { AdminEmpty } from "@/components/admin/admin-ui";
import { CheckboxField, TextAreaField, TextField } from "@/components/admin/form-helpers";
import { BannerIllustration } from "@/components/shop/banner-illustration";
import { HomeBannerCard } from "@/components/shop/home-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteBanner, reorderBanners, saveBanner } from "@/features/banners/actions";
import {
  BANNER_ILLUSTRATION_KEYS,
  BANNER_ILLUSTRATIONS,
  type BannerIllustration as Illustration,
  type HomeBanner,
} from "@/features/banners/types";
import { CATALOG_BUCKET, storageImageUrl } from "@/lib/images";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Errors = Partial<Record<string, string[]>>;
type Draft = {
  id?: string;
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  imagePath: string | null;
  illustration: Illustration;
  isActive: boolean;
};

const ACCEPTED: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/avif": "avif",
};
const MAX_BYTES = 2 * 1024 * 1024;

const EMPTY: Draft = {
  eyebrow: "",
  title: "",
  body: "",
  ctaLabel: "",
  ctaHref: "",
  imagePath: null,
  illustration: "build",
  isActive: true,
};

const toDraft = (banner: HomeBanner): Draft => ({
  id: banner.id,
  eyebrow: banner.eyebrow ?? "",
  title: banner.title,
  body: banner.body ?? "",
  ctaLabel: banner.ctaLabel ?? "",
  ctaHref: banner.ctaHref ?? "",
  imagePath: banner.imagePath,
  illustration: banner.illustration,
  isActive: banner.isActive,
});

export function BannersManager({ banners }: { banners: HomeBanner[] }) {
  const router = useRouter();
  const [order, setOrder] = useState(banners);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // La lista local sigue a la del servidor después de cada guardado.
  const [source, setSource] = useState(banners);
  if (source !== banners) {
    setSource(banners);
    setOrder(banners);
  }
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
      toast.error("Usa una imagen WebP, JPG, PNG o AVIF.");
      return;
    }
    if (picked.size > MAX_BYTES) {
      toast.error("La imagen pesa más de 2 MB. Redúcela antes de subirla.");
      return;
    }
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  }

  function removeImage() {
    setFile(null);
    setPreview(null);
    set("imagePath", null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function move(index: number, delta: number) {
    const next = [...order];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(index + delta, 0, item);
    setOrder(next);
    startTransition(async () => {
      const result = await reorderBanners({ ids: next.map((banner) => banner.id) });
      if (!result.ok) {
        toast.error(result.error.message);
        setOrder(order);
        return;
      }
      router.refresh();
    });
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    startTransition(async () => {
      let imagePath = draft.imagePath;
      let uploaded: string | null = null;
      const supabase = createClient();
      if (file) {
        uploaded = `banners/${crypto.randomUUID()}.${ACCEPTED[file.type]}`;
        const { error } = await supabase.storage
          .from(CATALOG_BUCKET)
          .upload(uploaded, file, { contentType: file.type, cacheControl: "31536000" });
        if (error) {
          toast.error(`No se pudo subir la imagen (${error.message}).`);
          return;
        }
        imagePath = uploaded;
      }

      const result = await saveBanner({ ...draft, imagePath });
      if (!result.ok) {
        if (uploaded) await supabase.storage.from(CATALOG_BUCKET).remove([uploaded]);
        setErrors(result.error.fieldErrors ?? {});
        toast.error(result.error.message);
        return;
      }
      toast.success(draft.id ? "Anuncio actualizado en la portada" : "Anuncio creado");
      setDraft(null);
      setFile(null);
      setPreview(null);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteBanner({ id });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Anuncio eliminado");
      setDeleting(null);
      router.refresh();
    });
  }

  // El lado de la imagen se alterna entre los anuncios visibles.
  const activeIds = order.filter((banner) => banner.isActive).map((banner) => banner.id);

  return (
    <div className="grid gap-6">
      <section aria-label="Anuncios de la portada" className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-prose text-sm text-muted-foreground">
            Aparecen entre las secciones de la portada, en este orden, alternando el lado de la
            imagen. Usa las flechas para reordenarlos.
          </p>
          <Button onClick={() => open(EMPTY)}>
            <PlusIcon aria-hidden />
            Nuevo anuncio
          </Button>
        </div>

        {order.length ? (
          <ol className="grid gap-2">
            {order.map((banner, index) => (
              <li
                key={banner.id}
                className={cn(
                  "flex flex-wrap items-center gap-4 rounded-xl border bg-card p-3",
                  draft?.id === banner.id && "border-primary ring-3 ring-ring/20",
                  !banner.isActive && "opacity-70",
                )}
              >
                <span className="relative grid h-16 w-28 shrink-0 place-items-center overflow-hidden rounded-lg bg-secondary">
                  {banner.imagePath ? (
                    <Image
                      src={storageImageUrl(banner.imagePath)}
                      alt=""
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  ) : (
                    <BannerIllustration kind={banner.illustration} className="h-14 w-24" />
                  )}
                </span>
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <span className="truncate font-semibold">{banner.title}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {[banner.eyebrow, banner.ctaLabel && `Botón: ${banner.ctaLabel}`]
                      .filter(Boolean)
                      .join(" · ") || "Sin botón"}
                  </span>
                  <span className="flex gap-1">
                    {banner.isActive ? (
                      <Badge variant="outline">
                        {activeIds.indexOf(banner.id) % 2 === 0
                          ? "Imagen a la derecha"
                          : "Imagen a la izquierda"}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Oculto</Badge>
                    )}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Subir «${banner.title}»`}
                    disabled={pending || index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUpIcon aria-hidden />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Bajar «${banner.title}»`}
                    disabled={pending || index === order.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDownIcon aria-hidden />
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => open(toDraft(banner))}>
                    <PencilIcon aria-hidden />
                    Editar
                  </Button>
                  {deleting === banner.id ? (
                    <>
                      <Button
                        size="sm"
                        variant="destructive"
                        isLoading={pending}
                        onClick={() => remove(banner.id)}
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
                      aria-label={`Eliminar «${banner.title}»`}
                      onClick={() => setDeleting(banner.id)}
                    >
                      <Trash2Icon aria-hidden />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <AdminEmpty>
            No hay anuncios. Crea uno para separar las secciones de la portada.
          </AdminEmpty>
        )}
      </section>

      {draft && (
        <form
          ref={formRef}
          onSubmit={save}
          noValidate
          aria-label={draft.id ? "Editar anuncio" : "Nuevo anuncio"}
          className="grid scroll-mt-20 gap-6 rounded-xl border bg-card p-5"
        >
          <h2 className="text-lg font-bold">
            {draft.id ? `Editar «${draft.title}»` : "Nuevo anuncio"}
          </h2>

          <div className="grid gap-2">
            <span className="text-sm font-semibold">Vista previa</span>
            <HomeBannerCard
              banner={{
                ...draft,
                eyebrow: draft.eyebrow || null,
                title: draft.title || "Título del anuncio",
                body: draft.body || null,
                ctaLabel: draft.ctaLabel || null,
                ctaHref: draft.ctaHref || null,
              }}
              imageSrc={preview}
              headingLevel="h3"
              className="pointer-events-none bg-background"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="grid content-start gap-5">
              <TextField
                name="eyebrow"
                label="Antetítulo"
                optional
                errors={errors}
                maxLength={40}
                placeholder="Computadores a la medida"
                value={draft.eyebrow}
                onChange={(event) => set("eyebrow", event.target.value)}
              />
              <TextField
                name="title"
                label="Título"
                errors={errors}
                maxLength={70}
                placeholder="Armamos tu PC"
                value={draft.title}
                onChange={(event) => set("title", event.target.value)}
              />
              <TextAreaField
                name="body"
                label="Texto"
                optional
                errors={errors}
                maxLength={220}
                rows={3}
                hint={`${draft.body.length}/220`}
                value={draft.body}
                onChange={(event) => set("body", event.target.value)}
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  name="ctaLabel"
                  label="Texto del botón"
                  optional
                  errors={errors}
                  maxLength={30}
                  placeholder="Ver computadores"
                  value={draft.ctaLabel}
                  onChange={(event) => set("ctaLabel", event.target.value)}
                />
                <TextField
                  name="ctaHref"
                  label="Enlace del botón"
                  optional
                  errors={errors}
                  placeholder="/soporte"
                  hint="Ruta de la tienda: /productos, /soporte, /categorias/…"
                  value={draft.ctaHref}
                  onChange={(event) => set("ctaHref", event.target.value)}
                />
              </div>
            </div>

            <div className="grid content-start gap-5">
              <fieldset className="grid gap-2">
                <legend className="mb-2 text-sm font-semibold">Imagen</legend>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileRef}
                    id="banner-image"
                    type="file"
                    accept={Object.keys(ACCEPTED).join(",")}
                    className="sr-only"
                    onChange={(event) => pickFile(event.target.files?.[0])}
                  />
                  <Button asChild variant="secondary" size="sm">
                    <label htmlFor="banner-image" className="cursor-pointer">
                      <ImagePlusIcon aria-hidden />
                      {draft.imagePath || file ? "Cambiar imagen" : "Subir imagen"}
                    </label>
                  </Button>
                  {(draft.imagePath || file) && (
                    <Button type="button" variant="ghost" size="sm" onClick={removeImage}>
                      <XIcon aria-hidden />
                      Usar ilustración
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Foto horizontal (ideal 1200 × 800), máximo 2 MB. Se difumina hacia el texto. Sin
                  imagen se usa la ilustración elegida abajo.
                </p>
              </fieldset>

              <fieldset className="grid gap-2" disabled={Boolean(draft.imagePath || file)}>
                <legend className="mb-2 text-sm font-semibold">
                  Ilustración{" "}
                  {(draft.imagePath || file) && (
                    <span className="font-normal text-muted-foreground">(hay una imagen)</span>
                  )}
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {BANNER_ILLUSTRATION_KEYS.map((key) => (
                    <label
                      key={key}
                      className="grid cursor-pointer justify-items-center gap-1 rounded-lg border bg-background p-2 text-center text-xs transition-colors has-checked:border-primary has-checked:bg-primary-soft has-focus-visible:ring-3 has-focus-visible:ring-ring/40 has-disabled:cursor-not-allowed has-disabled:opacity-50"
                    >
                      <input
                        type="radio"
                        name="illustration"
                        value={key}
                        checked={draft.illustration === key}
                        onChange={() => set("illustration", key)}
                        className="sr-only"
                      />
                      <BannerIllustration kind={key} className="h-12 w-16" />
                      {BANNER_ILLUSTRATIONS[key]}
                    </label>
                  ))}
                </div>
              </fieldset>

              <CheckboxField
                name="isActive"
                label="Mostrar en la portada"
                checked={draft.isActive}
                onCheckedChange={(checked) => set("isActive", checked)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" isLoading={pending}>
              {draft.id ? "Guardar cambios" : "Crear anuncio"}
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
