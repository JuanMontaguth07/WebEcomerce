import { z } from "zod";

export const signInSchema = z.object({
  // Primero se limpia y luego se valida (un espacio al pegar no debe invalidar el correo).
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Escribe un correo válido, por ejemplo nombre@dominio.com.").max(254)),
  password: z.string().min(1, "Escribe tu contraseña.").max(128),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const resetRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Escribe un correo válido, por ejemplo nombre@dominio.com.").max(254)),
});

/** Misma política que Supabase Auth: 10+ caracteres con minúsculas, mayúsculas y números. */
export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(10, "Usa al menos 10 caracteres.")
      .max(72, "Máximo 72 caracteres.")
      .regex(/[a-z]/, "Incluye al menos una minúscula.")
      .regex(/[A-Z]/, "Incluye al menos una mayúscula.")
      .regex(/\d/, "Incluye al menos un número."),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden.",
  });
