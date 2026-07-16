import { z } from "zod";

export const LoginSchema = z.object({
  body: z.object({
    email: z.email("Formato de email inválido."),
    password: z.string().min(1, "La contraseña es requerida."),
  }),
});

// El registro público NO acepta rol: siempre crea cuentas USER.
// Las cuentas con privilegios se crean desde el panel (POST /users, solo ADMIN).
export const RegisterSchema = z.object({
  body: z.object({
    email: z.email("Formato de email inválido."),
    password: z.string().regex(/^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/, {
      message:
        "La contraseña debe tener al menos 8 caracteres, una mayúscula y un número",
    }),
  }),
});

export const VerifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1, "El token es requerido."),
  }),
});

export const ResendVerificationSchema = z.object({
  body: z.object({
    email: z.email("Formato de email inválido."),
  }),
});

export type LoginBody = z.infer<typeof LoginSchema>["body"];
export type RegisterBody = z.infer<typeof RegisterSchema>["body"];
export type VerifyEmailBody = z.infer<typeof VerifyEmailSchema>["body"];
export type ResendVerificationBody = z.infer<
  typeof ResendVerificationSchema
>["body"];
