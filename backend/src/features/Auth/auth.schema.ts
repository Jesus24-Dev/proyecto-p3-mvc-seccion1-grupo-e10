import { z } from "zod";
import { roles } from "../../generated/prisma/browser";

export const LoginSchema = z.object({
  body: z.object({
    email: z.email("Formato de email inválido."),
    password: z.string().min(1, "La contraseña es requerida."),
  }),
});

export const RegisterSchema = z.object({
  body: z.object({
    email: z.email("Formato de email inválido."),
    password: z.string().regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
      message:
        "La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial",
    }),
    role: z.enum(roles, {
      error: () => ({ message: "El rol seleccionado no es válido." }),
    }),
  }),
});

export type LoginBody = z.infer<typeof LoginSchema>["body"];
export type RegisterBody = z.infer<typeof RegisterSchema>["body"];
