"use server";

import { z } from "zod";
import { revalidateCatalog } from "@/features/catalog/revalidate";
import { adminAction } from "@/lib/admin-action";
import { AppError, toAppError } from "@/lib/errors";
import { CATALOG_BUCKET } from "@/lib/images";
import {
  brandSchema,
  categorySchema,
  productSchema,
  specDefinitionSchema,
  type ProductValues,
} from "./catalog-schemas";
import { translateDbError } from "./shared";

// -----------------------------------------------------------------------------
// Productos
// -----------------------------------------------------------------------------

const PRODUCT_UNIQUE = {
  products_slug_key: { field: "slug", message: "Ya existe un producto con este slug." },
  products_sku_key: { field: "sku", message: "Ya existe un producto con este SKU." },
};

function toProductRow(values: ProductValues) {
  return {
    name: values.name,
    slug: values.slug,
    sku: values.sku,
    product_type: values.productType,
    category_id: values.categoryId,
    brand_id: values.brandId ?? null,
    rarity_id: values.rarityId ?? null,
    flag_id: values.flagId ?? null,
    unique_note: values.uniqueNote ?? null,
    price: values.price,
    compare_at_price: values.compareAtPrice ?? null,
    low_stock_threshold: values.lowStockThreshold,
    warranty_months: values.warrantyMonths ?? null,
    short_description: values.shortDescription ?? null,
    description: values.description ?? null,
    is_active: values.isActive,
    is_featured: values.isFeatured,
    seo_title: values.seoTitle ?? null,
    seo_description: values.seoDescription ?? null,
  };
}

export const createProduct = adminAction(productSchema, async (values, { supabase }) => {
  const { data, error } = await supabase
    .from("products")
    .insert(toProductRow(values))
    .select("id, slug")
    .single();
  if (error) translateDbError(error, { uniqueFields: PRODUCT_UNIQUE });
  revalidateCatalog({ productSlugs: [data.slug] });
  return { id: data.id };
});

export const updateProduct = adminAction(
  z.object({ id: z.uuid(), values: productSchema }),
  async ({ id, values }, { supabase }) => {
    const { data: previous } = await supabase
      .from("products")
      .select("slug")
      .eq("id", id)
      .maybeSingle();
    if (!previous) throw new AppError("NOT_FOUND");

    const { error } = await supabase.from("products").update(toProductRow(values)).eq("id", id);
    if (error) translateDbError(error, { uniqueFields: PRODUCT_UNIQUE });

    revalidateCatalog({ productSlugs: [previous.slug, values.slug] });
    return { id };
  },
);

const reasonSchema = z.string().trim().max(500, "Máximo 500 caracteres.").optional();

/**
 * Elimina con la función delete_product: pedidos y movimientos conservan nombre
 * y SKU, el borrado queda en el historial con su motivo y el stock sale con un
 * movimiento. Rechaza productos en pedidos sin cerrar.
 */
async function removeProduct(supabase: AdminSupabase, id: string, reason?: string) {
  const { data, error } = await supabase.rpc("delete_product", {
    p_product_id: id,
    p_reason: reason || undefined,
  });
  if (error) {
    if (error.message === "PRODUCT_IN_OPEN_ORDERS") {
      throw new AppError("PRODUCT_IN_OPEN_ORDERS", {
        message: `Está en pedidos sin cerrar (${error.details}). Entrégalos o cancélalos antes de eliminarlo.`,
      });
    }
    throw error;
  }
  const result = data as { slug: string; images: string[] };
  await removeFiles(supabase, result.images);
  return result.slug;
}

export const deleteProduct = adminAction(
  z.object({ id: z.uuid(), reason: reasonSchema }),
  async ({ id, reason }, { supabase }) => {
    const slug = await removeProduct(supabase, id, reason);
    revalidateCatalog({ productSlugs: [slug] });
    return { id };
  },
);

export const duplicateProduct = adminAction(
  z.object({ id: z.uuid() }),
  async ({ id }, { supabase }) => {
    const { data, error } = await supabase.rpc("duplicate_product", { p_product_id: id });
    if (error) throw error;
    // La copia nace oculta: la tienda no cambia, pero el listado del panel sí.
    revalidateCatalog();
    return { id: data };
  },
);

const bulkIds = z.array(z.uuid()).min(1, "Selecciona al menos un producto.").max(100);

export const bulkUpdateProducts = adminAction(
  z.object({
    ids: bulkIds,
    change: z.enum(["show", "hide", "feature", "unfeature"]),
  }),
  async ({ ids, change }, { supabase }) => {
    const values = {
      show: { is_active: true },
      hide: { is_active: false },
      feature: { is_featured: true },
      unfeature: { is_featured: false },
    }[change];
    const { data, error } = await supabase
      .from("products")
      .update(values)
      .in("id", ids)
      .select("slug");
    if (error) throw error;
    revalidateCatalog({ productSlugs: data.map((row) => row.slug) });
    return { updated: data.length };
  },
);

export const bulkDeleteProducts = adminAction(
  z.object({ ids: bulkIds, reason: reasonSchema }),
  async ({ ids, reason }, { supabase }) => {
    const slugs: string[] = [];
    const failed: string[] = [];
    // Uno por uno: un producto en pedidos sin cerrar no impide borrar los demás.
    for (const id of ids) {
      try {
        slugs.push(await removeProduct(supabase, id, reason));
      } catch (error) {
        if (toAppError(error).code === "INTERNAL") throw error;
        failed.push(id);
      }
    }
    revalidateCatalog({ productSlugs: slugs });
    return { deleted: slugs.length, failed };
  },
);

export const saveProductSpecs = adminAction(
  z.object({
    productId: z.uuid(),
    specs: z.array(z.object({ specId: z.uuid(), value: z.string().max(300) })).max(100),
  }),
  async ({ productId, specs }, { supabase }) => {
    const { error } = await supabase.rpc("set_product_specs", {
      p_product_id: productId,
      p_specs: specs.map((spec) => ({ spec_id: spec.specId, value: spec.value })),
    });
    if (error) {
      if (error.code === "22P02") {
        throw new AppError("VALIDATION", {
          message: "Revisa los valores numéricos de la ficha técnica.",
        });
      }
      throw error;
    }
    await revalidateProductById(supabase, productId);
    return { saved: specs.length };
  },
);

// -----------------------------------------------------------------------------
// Imágenes (el archivo se sube desde el navegador con la sesión del admin)
// -----------------------------------------------------------------------------

const imagePath = (productId: string) =>
  z
    .string()
    .regex(/^products\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(webp|jpg|jpeg|png|avif)$/)
    .refine((path) => path.startsWith(`products/${productId}/`), "Ruta de imagen inválida.");

export const addProductImage = adminAction(
  z
    .object({
      productId: z.uuid(),
      path: z.string(),
      alt: z.string().trim().min(1, "Describe la imagen.").max(200),
      width: z.number().int().positive().max(20_000).optional(),
      height: z.number().int().positive().max(20_000).optional(),
    })
    .superRefine((value, ctx) => {
      if (!imagePath(value.productId).safeParse(value.path).success) {
        ctx.addIssue({ code: "custom", path: ["path"], message: "Ruta de imagen inválida." });
      }
    }),
  async (input, { supabase }) => {
    const { data: last } = await supabase
      .from("product_images")
      .select("position")
      .eq("product_id", input.productId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, error } = await supabase
      .from("product_images")
      .insert({
        product_id: input.productId,
        storage_path: input.path,
        alt_text: input.alt,
        position: (last?.position ?? -1) + 1,
        width: input.width ?? null,
        height: input.height ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    await revalidateProductById(supabase, input.productId);
    return { id: data.id };
  },
);

export const updateImageAlt = adminAction(
  z.object({ imageId: z.uuid(), alt: z.string().trim().min(1, "Describe la imagen.").max(200) }),
  async ({ imageId, alt }, { supabase }) => {
    const { data, error } = await supabase
      .from("product_images")
      .update({ alt_text: alt })
      .eq("id", imageId)
      .select("product_id")
      .single();
    if (error) throw error;
    await revalidateProductById(supabase, data.product_id);
    return { imageId };
  },
);

export const deleteProductImage = adminAction(
  z.object({ imageId: z.uuid() }),
  async ({ imageId }, { supabase }) => {
    const { data, error } = await supabase
      .from("product_images")
      .delete()
      .eq("id", imageId)
      .select("product_id, storage_path")
      .single();
    if (error) throw error;
    await removeFiles(supabase, [data.storage_path]);
    // Compacta posiciones para que la primera imagen siga siendo la principal.
    const { data: rest } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", data.product_id)
      .order("position");
    if (rest?.length) {
      await supabase.rpc("reorder_product_images", {
        p_product_id: data.product_id,
        p_image_ids: rest.map((image) => image.id),
      });
    }
    await revalidateProductById(supabase, data.product_id);
    return { imageId };
  },
);

export const reorderProductImages = adminAction(
  z.object({ productId: z.uuid(), imageIds: z.array(z.uuid()).max(30) }),
  async ({ productId, imageIds }, { supabase }) => {
    const { error } = await supabase.rpc("reorder_product_images", {
      p_product_id: productId,
      p_image_ids: imageIds,
    });
    if (error) throw error;
    await revalidateProductById(supabase, productId);
    return { productId };
  },
);

type AdminSupabase = Parameters<Parameters<typeof adminAction>[1]>[1]["supabase"];

/**
 * Borra archivos del bucket. Si Storage no elimina todos (p. ej. por permisos),
 * se registra para poder limpiar huérfanos; el registro en la base ya se borró.
 */
async function removeFiles(supabase: AdminSupabase, paths: string[]) {
  if (!paths.length) return;
  const { data, error } = await supabase.storage.from(CATALOG_BUCKET).remove(paths);
  if (error || (data?.length ?? 0) < paths.length) {
    console.error("[storage] archivos sin borrar", {
      paths,
      removed: data?.length ?? 0,
      error: error?.message,
    });
  }
}

async function revalidateProductById(supabase: AdminSupabase, productId: string) {
  const { data } = await supabase.from("products").select("slug").eq("id", productId).maybeSingle();
  revalidateCatalog({ productSlugs: data ? [data.slug] : [] });
}

// -----------------------------------------------------------------------------
// Categorías y especificaciones
// -----------------------------------------------------------------------------

const CATEGORY_UNIQUE = {
  categories_slug_key: { field: "slug", message: "Ya existe una categoría con este slug." },
};

function toCategoryRow(values: z.output<typeof categorySchema>) {
  return {
    name: values.name,
    slug: values.slug,
    parent_id: values.parentId ?? null,
    description: values.description ?? null,
    position: values.position,
    is_active: values.isActive,
    seo_title: values.seoTitle ?? null,
    seo_description: values.seoDescription ?? null,
    image_path: values.imagePath,
  };
}

/**
 * La tienda maneja dos niveles: el padre debe ser una categoría principal y una
 * categoría con subcategorías no puede volverse hija (evita niveles ocultos y ciclos).
 */
async function assertValidParent(
  supabase: AdminSupabase,
  categoryId: string | null,
  parentId: string | null | undefined,
) {
  if (!parentId) return;
  const invalid = (message: string) =>
    new AppError("VALIDATION", { details: { parentId: [message] } });
  if (parentId === categoryId) throw invalid("Una categoría no puede ser su propio padre.");

  const { data: parent } = await supabase
    .from("categories")
    .select("parent_id")
    .eq("id", parentId)
    .maybeSingle();
  if (!parent) throw invalid("La categoría padre no existe.");
  if (parent.parent_id) throw invalid("Elige una categoría principal como padre.");

  if (categoryId) {
    const { count } = await supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", categoryId);
    if (count) throw invalid("Esta categoría tiene subcategorías: no puede depender de otra.");
  }
}

export const createCategory = adminAction(categorySchema, async (values, { supabase }) => {
  await assertValidParent(supabase, null, values.parentId);
  const { data, error } = await supabase
    .from("categories")
    .insert(toCategoryRow(values))
    .select("id")
    .single();
  if (error) translateDbError(error, { uniqueFields: CATEGORY_UNIQUE });
  revalidateCatalog({ categories: true });
  return { id: data.id };
});

export const updateCategory = adminAction(
  z.object({ id: z.uuid(), values: categorySchema }),
  async ({ id, values }, { supabase }) => {
    await assertValidParent(supabase, id, values.parentId);
    const { data: previous } = await supabase
      .from("categories")
      .select("image_path")
      .eq("id", id)
      .maybeSingle();
    const { error } = await supabase.from("categories").update(toCategoryRow(values)).eq("id", id);
    if (error) translateDbError(error, { uniqueFields: CATEGORY_UNIQUE });
    // La foto reemplazada o quitada ya no la usa nadie.
    if (previous?.image_path && previous.image_path !== values.imagePath) {
      await removeFiles(supabase, [previous.image_path]);
    }
    revalidateCatalog({ categories: true });
    return { id };
  },
);

export const deleteCategory = adminAction(
  z.object({ id: z.uuid() }),
  async ({ id }, { supabase }) => {
    const { data, error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id)
      .select("image_path")
      .maybeSingle();
    if (error) {
      translateDbError(error, {
        inUse: "La categoría tiene productos o subcategorías. Muévelos o desactiva la categoría.",
      });
    }
    if (data?.image_path) await removeFiles(supabase, [data.image_path]);
    revalidateCatalog({ categories: true });
    return { id };
  },
);

export const saveSpecDefinition = adminAction(
  specDefinitionSchema,
  async (values, { supabase }) => {
    const row = {
      category_id: values.categoryId,
      key: values.key,
      label: values.label,
      group_label: values.groupLabel ?? null,
      unit: values.unit ?? null,
      data_type: values.dataType,
      is_filterable: values.isFilterable,
      show_on_card: values.showOnCard,
      position: values.position,
    };
    const { data, error } = values.id
      ? await supabase
          .from("spec_definitions")
          .update(row)
          .eq("id", values.id)
          .select("id")
          .single()
      : await supabase.from("spec_definitions").insert(row).select("id").single();
    if (error?.message.includes("CARD_SPECS_LIMIT")) {
      throw new AppError("VALIDATION", {
        details: {
          showOnCard: ["La tarjeta muestra hasta 3. Desmarca otra especificación primero."],
        },
      });
    }
    if (error) {
      translateDbError(error, {
        uniqueFields: {
          spec_definitions_category_key_unique: {
            field: "key",
            message: "Esta categoría ya tiene una especificación con esa clave.",
          },
        },
      });
    }
    revalidateCatalog();
    return { id: data.id };
  },
);

export const deleteSpecDefinition = adminAction(
  z.object({ id: z.uuid() }),
  async ({ id }, { supabase }) => {
    // Borra también los valores asociados (ON DELETE CASCADE).
    const { error } = await supabase.from("spec_definitions").delete().eq("id", id);
    if (error) throw error;
    revalidateCatalog();
    return { id };
  },
);

// -----------------------------------------------------------------------------
// Marcas
// -----------------------------------------------------------------------------

const BRAND_UNIQUE = {
  brands_slug_key: { field: "slug", message: "Ya existe una marca con este slug." },
  brands_name_key: { field: "name", message: "Ya existe una marca con este nombre." },
};

function toBrandRow(values: z.output<typeof brandSchema>) {
  return {
    name: values.name,
    slug: values.slug,
    description: values.description ?? null,
    is_active: values.isActive,
    logo_path: values.logoPath,
  };
}

export const createBrand = adminAction(brandSchema, async (values, { supabase }) => {
  const { data, error } = await supabase
    .from("brands")
    .insert(toBrandRow(values))
    .select("id")
    .single();
  if (error) translateDbError(error, { uniqueFields: BRAND_UNIQUE });
  revalidateCatalog({ brands: true });
  return { id: data.id };
});

export const updateBrand = adminAction(
  z.object({ id: z.uuid(), values: brandSchema }),
  async ({ id, values }, { supabase }) => {
    const { data: previous } = await supabase
      .from("brands")
      .select("logo_path")
      .eq("id", id)
      .maybeSingle();
    const { error } = await supabase.from("brands").update(toBrandRow(values)).eq("id", id);
    if (error) translateDbError(error, { uniqueFields: BRAND_UNIQUE });
    // El logo reemplazado o quitado ya no lo usa nadie.
    if (previous?.logo_path && previous.logo_path !== values.logoPath) {
      await removeFiles(supabase, [previous.logo_path]);
    }
    revalidateCatalog({ brands: true });
    return { id };
  },
);

export const deleteBrand = adminAction(z.object({ id: z.uuid() }), async ({ id }, { supabase }) => {
  const { data, error } = await supabase
    .from("brands")
    .delete()
    .eq("id", id)
    .select("logo_path")
    .maybeSingle();
  if (error) {
    translateDbError(error, {
      inUse: "La marca tiene productos asociados. Cámbiales la marca o desactívala.",
    });
  }
  if (data?.logo_path) await removeFiles(supabase, [data.logo_path]);
  revalidateCatalog({ brands: true });
  return { id };
});
