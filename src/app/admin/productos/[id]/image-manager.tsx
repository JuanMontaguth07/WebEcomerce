"use client";

import { ArrowDownIcon, ArrowUpIcon, ImagePlusIcon, Trash2Icon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addProductImage,
  deleteProductImage,
  reorderProductImages,
  updateImageAlt,
} from "@/features/admin/catalog-actions";
import { CATALOG_BUCKET, storageImageUrl } from "@/lib/images";
import { createClient } from "@/lib/supabase/client";

type ProductImageRow = { id: string; storage_path: string; alt_text: string };

const ACCEPTED = ["image/webp", "image/jpeg", "image/png", "image/avif"];
const MAX_BYTES = 5 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/avif": "avif",
};

async function readDimensions(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return {};
  }
}

export function ImageManager({
  productId,
  productName,
  images,
}: {
  productId: string;
  productName: string;
  images: ProductImageRow[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [alts, setAlts] = useState<Record<string, string>>({});

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    const supabase = createClient();
    let added = 0;

    for (const file of Array.from(files)) {
      if (!ACCEPTED.includes(file.type)) {
        toast.error(`${file.name}: usa WebP, JPG, PNG o AVIF.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name}: pesa más de 5 MB. Redúcela antes de subirla.`);
        continue;
      }
      const path = `products/${productId}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
      const { error: uploadError } = await supabase.storage
        .from(CATALOG_BUCKET)
        .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
      if (uploadError) {
        toast.error(`${file.name}: no se pudo subir (${uploadError.message}).`);
        continue;
      }
      const result = await addProductImage({
        productId,
        path,
        alt: productName,
        ...(await readDimensions(file)),
      });
      if (result.ok) added++;
      else {
        await supabase.storage.from(CATALOG_BUCKET).remove([path]);
        toast.error(result.error.message);
      }
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (added) {
      toast.success(added === 1 ? "Imagen agregada" : `${added} imágenes agregadas`);
      router.refresh();
    }
  }

  function run(
    action: () => Promise<{ ok: boolean; error?: { message: string } }>,
    message: string,
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(message);
        router.refresh();
      } else {
        toast.error(result.error?.message ?? "No se pudo completar la acción.");
      }
    });
  }

  function move(index: number, delta: number) {
    const ids = images.map((image) => image.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target] as string, ids[index] as string];
    run(() => reorderProductImages({ productId, imageIds: ids }), "Orden actualizado");
  }

  return (
    <div className="grid gap-4">
      {images.length ? (
        <ul className="grid gap-3">
          {images.map((image, index) => (
            <li key={image.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              <span className="relative size-20 shrink-0 overflow-hidden rounded-md border bg-secondary">
                <Image
                  src={storageImageUrl(image.storage_path)}
                  alt={image.alt_text}
                  fill
                  sizes="80px"
                  className="object-contain p-1"
                />
              </span>
              <div className="grid min-w-48 flex-1 gap-1.5">
                <label htmlFor={`alt-${image.id}`} className="text-xs font-semibold">
                  {index === 0 ? "Imagen principal · " : ""}Texto alternativo
                </label>
                <div className="flex gap-2">
                  <Input
                    id={`alt-${image.id}`}
                    value={alts[image.id] ?? image.alt_text}
                    maxLength={200}
                    onChange={(event) =>
                      setAlts((current) => ({ ...current, [image.id]: event.target.value }))
                    }
                  />
                  {alts[image.id] !== undefined && alts[image.id] !== image.alt_text && (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => updateImageAlt({ imageId: image.id, alt: alts[image.id] ?? "" }),
                          "Texto guardado",
                        )
                      }
                    >
                      Guardar
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={pending || index === 0}
                  onClick={() => move(index, -1)}
                  aria-label="Subir imagen"
                >
                  <ArrowUpIcon aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={pending || index === images.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label="Bajar imagen"
                >
                  <ArrowDownIcon aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={pending}
                  onClick={() =>
                    run(() => deleteProductImage({ imageId: image.id }), "Imagen eliminada")
                  }
                  aria-label="Eliminar imagen"
                >
                  <Trash2Icon className="text-destructive" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Sin imágenes: la tienda muestra la ilustración de la categoría.
        </p>
      )}

      <div>
        <input
          ref={inputRef}
          id="product-images"
          type="file"
          accept={ACCEPTED.join(",")}
          multiple
          className="sr-only"
          onChange={(event) => handleFiles(event.target.files)}
        />
        <Button
          type="button"
          variant="secondary"
          isLoading={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {!uploading && <ImagePlusIcon aria-hidden />}
          {uploading ? "Subiendo…" : "Agregar imágenes"}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          WebP, JPG, PNG o AVIF, máximo 5 MB. Recomendado: fondo claro y 1200 px o más.
        </p>
      </div>
    </div>
  );
}
