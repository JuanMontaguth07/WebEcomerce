"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CheckboxField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/admin/form-helpers";
import { Button } from "@/components/ui/button";
import { createCategory, updateCategory } from "@/features/admin/catalog-actions";
import { slugify } from "@/lib/format";

type Errors = Partial<Record<string, string[]>>;

export type CategoryFormValues = {
  name: string;
  slug: string;
  parentId: string;
  description: string;
  position: string;
  isActive: boolean;
  seoTitle: string;
  seoDescription: string;
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

  const set = (key: keyof CategoryFormValues, value: string | boolean) => {
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

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = categoryId
        ? await updateCategory({ id: categoryId, values })
        : await createCategory(values);
      if (!result.ok) {
        setErrors(result.error.fieldErrors ?? {});
        toast.error(result.error.message);
        return;
      }
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
