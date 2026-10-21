import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Escribe un correo válido, por ejemplo nombre@dominio.com.").max(254).trim(),
  password: z.string().min(1, "Escribe tu contraseña.").max(128),
});

export type SignInInput = z.infer<typeof signInSchema>;
