"use client";

import { ImagePlusIcon, XIcon } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CheckboxField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/admin/form-helpers";
import { CategoryIllustration } from "@/components/shop/category-illustration";
import { Button } from "@/components/ui/button";
import { createCategory, updateCategory } from "@/features/admin/catalog-actions";
import { slugify } from "@/lib/format";
import { CATALOG_BUCKET, storageImageUrl } from "@/lib/images";
import { createClient } from "@/lib/supabase/client";

type Errors = Partial<Record<string, string[]>>;

const ACCEPTED: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/avif": "avif",
};
const MAX_BYTES = 2 * 1024 * 1024;

export type CategoryFormValues = {
  name: string;
  slug: string;
  parentId: string;
  description: string;
  position: string;
  isActive: boolean;
  seoTitle: string;
  seoDescription: string;
  imagePath: string | null;
};

export const EMPTY_CATEGORY: CategoryFormValues = {
  name: "",
  slug: "",
  parentId: "",
  description: "",
  position: "0",
  isActive: true,
  seoTitle: "",
  seoDescription: "",
  imagePath: null,
};

export function CategoryForm({
  categoryId,
  initial,
  parents,
}: {
  categoryId?: string;
  initial: CategoryFormValues;
  parents: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(categoryId));
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const set = (key: keyof CategoryFormValues, value: string | boolean | null) => {
    setValues((current) => ({
      ...current,
      [key]: value,
      ...(key === "name" && !slugTouched ? { slug: slugify(String(value)) } : {}),
    }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };
  const text = (key: keyof CategoryFormValues) => ({
    value: String(values[key]),
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => set(key, event.target.value),
  });

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

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      let imagePath = values.imagePath;
      let uploaded: string | null = null;
      const supabase = createClient();
      if (file) {
        uploaded = `categories/${crypto.randomUUID()}.${ACCEPTED[file.type]}`;
        const { error } = await supabase.storage
          .from(CATALOG_BUCKET)
          .upload(uploaded, file, { contentType: file.type, cacheControl: "31536000" });
        if (error) {
          toast.error(`No se pudo subir la imagen (${error.message}).`);
          return;
        }
        imagePath = uploaded;
      }

      const next = { ...values, imagePath };
      const result = categoryId
        ? await updateCategory({ id: categoryId, values: next })
        : await createCategory(next);
      if (!result.ok) {
        if (uploaded) await supabase.storage.from(CATALOG_BUCKET).remove([uploaded]);
        setErrors(result.error.fieldErrors ?? {});
        toast.error(result.error.message);
        return;
      }
      setValues(next);
      setFile(null);
      setPreview(null);
      toast.success(categoryId ? "Categoría guardada" : "Categoría creada");
      if (categoryId) router.refresh();
      else router.push(`/admin/categorias/${result.data.id}` as Route);
    });
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 rounded-xl border bg-card p-5 sm:p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="name"
          label="Nombre"
          errors={errors}
          autoFocus={!categoryId}
          {...text("name")}
        />
        <TextField
          name="slug"
          label="Slug (URL)"
          errors={errors}
          hint={`/categorias/${values.slug || "…"}`}
          value={values.slug}
          onChange={(event) => {
            setSlugTouched(true);
            set("slug", slugify(event.target.value));
          }}
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          name="parentId"
          label="Categoría padre"
          optional
          errors={errors}
          options={[
            { value: "", label: "Ninguna (principal)" },
            ...parents.map((p) => ({ value: p.id, label: p.name })),
          ]}
          {...text("parentId")}
        />
        <TextField
          name="position"
          label="Orden"
          errors={errors}
          inputMode="numeric"
          hint="Menor número = aparece primero en el menú."
          {...text("position")}
        />
      </div>
      <TextAreaField
        name="description"
        label="Descripción"
        optional
        errors={errors}
        hint="Se muestra al inicio de la página de la categoría y ayuda al SEO."
        {...text("description")}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="seoTitle"
          label="Título para buscadores"
          optional
          errors={errors}
          maxLength={70}
          {...text("seoTitle")}
        />
        <TextField
          name="seoDescription"
          label="Descripción para buscadores"
          optional
          errors={errors}
          maxLength={160}
          {...text("seoDescription")}
        />
      </div>
      {!values.parentId && (
        <fieldset className="grid gap-3">
          <legend className="mb-2 text-sm font-semibold">
            Foto para la portada{" "}
            <span className="font-normal text-muted-foreground">(opcional)</span>
          </legend>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative grid aspect-4/3 w-40 shrink-0 place-items-center overflow-hidden rounded-lg border bg-background text-muted-foreground">
              {preview || values.imagePath ? (
                <Image
                  src={preview ?? storageImageUrl(values.imagePath as string)}
                  alt=""
                  fill
                  sizes="160px"
                  unoptimized={Boolean(preview)}
                  className="object-cover"
                />
              ) : (
                <CategoryIllustration categorySlug={values.slug} className="w-24" />
              )}
            </div>
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileRef}
                  id="category-image"
                  type="file"
                  accept={Object.keys(ACCEPTED).join(",")}
                  className="sr-only"
                  onChange={(event) => pickFile(event.target.files?.[0])}
                />
                <Button asChild variant="secondary" size="sm">
                  <label htmlFor="category-image" className="cursor-pointer">
                    <ImagePlusIcon aria-hidden />
                    {values.imagePath || file ? "Cambiar foto" : "Subir foto"}
                  </label>
                </Button>
                {(values.imagePath || file) && (
                  <Button type="button" variant="ghost" size="sm" onClick={removeImage}>
                    <XIcon aria-hidden />
                    Usar ilustración
                  </Button>
                )}
              </div>
              <p className="max-w-md text-xs text-muted-foreground">
                Se muestra en «Compra por categoría» de la portada. Foto horizontal (ideal 1200 ×
                900), máximo 2 MB. Sin foto se usa el dibujo de la categoría.
              </p>
            </div>
          </div>
        </fieldset>
      )}
      <CheckboxField
        name="isActive"
        label="Visible en la tienda"
        checked={values.isActive}
        onCheckedChange={(checked) => set("isActive", checked)}
      />
      <div>
        <Button type="submit" isLoading={pending}>
          {categoryId ? "Guardar cambios" : "Crear categoría"}
        </Button>
      </div>
    </form>
  );
}
