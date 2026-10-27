"use client";

import { ImagePlusIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CATALOG_BUCKET, storageImageUrl } from "@/lib/images";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const ACCEPTED: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/avif": "avif",
};
const MAX_BYTES = 2 * 1024 * 1024;

/** Carpetas del bucket que validan las migraciones (categories_image_path_format…). */
type Folder = "categories" | "brands";

/**
 * Imagen opcional de un formulario del panel: se elige y previsualiza en el
 * navegador y se sube al guardar. Si el guardado falla, `discard` borra lo
 * subido para no dejar archivos huérfanos en el bucket.
 */
export function useImageUpload(folder: Folder) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function pick(picked: File | undefined) {
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

  function reset() {
    setFile(null);
    setPreview(null);
  }

  /** Sube la imagen elegida. `path` es null si no se eligió una nueva. */
  async function upload(): Promise<{ ok: true; path: string | null } | { ok: false }> {
    if (!file) return { ok: true, path: null };
    const path = `${folder}/${crypto.randomUUID()}.${ACCEPTED[file.type]}`;
    const { error } = await createClient()
      .storage.from(CATALOG_BUCKET)
      .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    if (error) {
      toast.error(`No se pudo subir la imagen (${error.message}).`);
      return { ok: false };
    }
    return { ok: true, path };
  }

  async function discard(path: string | null) {
    if (path) await createClient().storage.from(CATALOG_BUCKET).remove([path]);
  }

  return { file, preview, pick, reset, upload, discard };
}

type ImageUpload = ReturnType<typeof useImageUpload>;

/** Vista previa, botones para elegir o quitar la imagen y su ayuda. */
export function ImageUploadField({
  id,
  legend,
  hint,
  image,
  currentPath,
  onRemove,
  fallback,
  removeLabel,
  fit = "cover",
}: {
  id: string;
  legend: string;
  hint: string;
  image: ImageUpload;
  /** Ruta guardada (null si no tiene). */
  currentPath: string | null;
  onRemove: () => void;
  /** Lo que se muestra sin imagen (ilustración o nombre). */
  fallback: React.ReactNode;
  removeLabel: string;
  /** `contain` para logos: no se recortan. */
  fit?: "cover" | "contain";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasImage = Boolean(image.file || currentPath);
  const src = image.preview ?? (currentPath ? storageImageUrl(currentPath) : null);

  function remove() {
    image.reset();
    onRemove();
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <fieldset className="grid gap-3">
      <legend className="mb-2 text-sm font-semibold">
        {legend} <span className="font-normal text-muted-foreground">(opcional)</span>
      </legend>
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative grid aspect-4/3 w-40 shrink-0 place-items-center overflow-hidden rounded-lg border bg-background text-muted-foreground">
          {src ? (
            <Image
              src={src}
              alt=""
              fill
              sizes="160px"
              unoptimized={Boolean(image.preview)}
              className={cn(fit === "cover" ? "object-cover" : "object-contain p-4")}
            />
          ) : (
            fallback
          )}
        </div>
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              id={id}
              type="file"
              accept={Object.keys(ACCEPTED).join(",")}
              className="sr-only"
              onChange={(event) => image.pick(event.target.files?.[0])}
            />
            <Button asChild variant="secondary" size="sm">
              <label htmlFor={id} className="cursor-pointer">
                <ImagePlusIcon aria-hidden />
                {hasImage ? "Cambiar imagen" : "Subir imagen"}
              </label>
            </Button>
            {hasImage && (
              <Button type="button" variant="ghost" size="sm" onClick={remove}>
                <XIcon aria-hidden />
                {removeLabel}
              </Button>
            )}
          </div>
          <p className="max-w-md text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
    </fieldset>
  );
}
