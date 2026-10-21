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
