/**
 * Manejo centralizado de errores.
 * Las funciones de PostgreSQL lanzan códigos en MAYÚSCULAS (p. ej. OUT_OF_STOCK);
 * aquí se traducen a errores tipados con un mensaje apto para el cliente.
 */

export const ERROR_CODES = [
  "VALIDATION",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "EMPTY_CART",
  "TOO_MANY_ITEMS",
  "INVALID_QUANTITY",
  "PRODUCT_UNAVAILABLE",
  "OUT_OF_STOCK",
  "INSUFFICIENT_STOCK",
  "CONSENT_REQUIRED",
  "INVALID_TRANSITION",
  "REASON_REQUIRED",
  "RATE_LIMITED",
  "CONFLICT",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const USER_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION: "Revisa los datos marcados e inténtalo de nuevo.",
  UNAUTHORIZED: "Inicia sesión para continuar.",
  FORBIDDEN: "No tienes permiso para realizar esta acción.",
  NOT_FOUND: "No encontramos lo que buscas.",
  EMPTY_CART: "Tu carrito está vacío.",
  TOO_MANY_ITEMS: "El pedido tiene demasiados productos distintos.",
  INVALID_QUANTITY: "Alguna cantidad no es válida.",
  PRODUCT_UNAVAILABLE: "Uno de los productos ya no está disponible.",
  OUT_OF_STOCK: "No hay unidades suficientes de uno o más productos.",
  INSUFFICIENT_STOCK: "El ajuste dejaría el inventario en negativo.",
  CONSENT_REQUIRED: "Debes autorizar el tratamiento de tus datos para continuar.",
  INVALID_TRANSITION: "El pedido no puede pasar a ese estado.",
  REASON_REQUIRED: "Indica el motivo del ajuste.",
  RATE_LIMITED: "Has hecho varios intentos seguidos. Espera unos minutos.",
  CONFLICT: "Ya existe un registro con esos datos.",
  INTERNAL: "Ocurrió un error inesperado. Inténtalo de nuevo.",
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(code: ErrorCode, options?: { message?: string; details?: unknown; cause?: unknown }) {
    super(options?.message ?? USER_MESSAGES[code], { cause: options?.cause });
    this.name = "AppError";
    this.code = code;
    this.details = options?.details;
  }
}

/** Resultado serializable para Server Actions (nunca lanza al cliente). */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: { code: ErrorCode; message: string; fieldErrors?: Record<string, string[]> };
    };

export function success<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function failure(error: unknown): ActionResult<never> {
  const appError = toAppError(error);
  return {
    ok: false,
    error: {
      code: appError.code,
      message: appError.message,
      fieldErrors:
        appError.code === "VALIDATION" ? (appError.details as Record<string, string[]>) : undefined,
    },
  };
}

function isErrorCode(value: string): value is ErrorCode {
  return (ERROR_CODES as readonly string[]).includes(value);
}

type PostgrestLikeError = { code?: string; message?: string; details?: string | null };

function isPostgrestLikeError(error: unknown): error is PostgrestLikeError {
  return typeof error === "object" && error !== null && "message" in error && "code" in error;
}

/** Normaliza cualquier error (AppError, error de Supabase/PostgREST o desconocido). */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (isPostgrestLikeError(error)) {
    const message = error.message ?? "";
    if (isErrorCode(message)) {
      return new AppError(message, { details: parseDetails(error.details), cause: error });
    }
    if (error.code === "42501") return new AppError("FORBIDDEN", { cause: error });
    if (error.code === "23505") return new AppError("CONFLICT", { cause: error });
    if (error.code === "23514" || error.code === "22P02") {
      return new AppError("VALIDATION", { cause: error });
    }
  }

  return new AppError("INTERNAL", { cause: error });
}

/**
 * Registra en el servidor solo los errores inesperados (INTERNAL). Los errores
 * de negocio (stock, permisos, validación) son respuestas normales.
 */
export function logError(context: string, error: unknown): void {
  const appError = toAppError(error);
  if (appError.code !== "INTERNAL") return;
  console.error(`[${context}]`, appError.cause ?? error);
}

function parseDetails(details: string | null | undefined): unknown {
  if (!details) return undefined;
  try {
    return JSON.parse(details);
  } catch {
    return details;
  }
}
