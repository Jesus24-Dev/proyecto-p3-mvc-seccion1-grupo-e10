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

const PASSWORD_RULE = z.string().regex(/^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/, {
  message:
    "La contraseña debe tener al menos 8 caracteres, una mayúscula y un número",
});

export const ChangePasswordSchema = z.object({
  body: z.object({
    current_password: z.string().min(1, "Ingresa tu contraseña actual."),
    new_password: PASSWORD_RULE,
  }),
});

export const ForgotPasswordSchema = z.object({
  body: z.object({
    email: z.email("Formato de email inválido."),
  }),
});

export const ResetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, "El token es requerido."),
    new_password: PASSWORD_RULE,
  }),
});

export type ChangePasswordBody = z.infer<typeof ChangePasswordSchema>["body"];
export type ForgotPasswordBody = z.infer<typeof ForgotPasswordSchema>["body"];
export type ResetPasswordBody = z.infer<typeof ResetPasswordSchema>["body"];

export type LoginBody = z.infer<typeof LoginSchema>["body"];
export type RegisterBody = z.infer<typeof RegisterSchema>["body"];
export type VerifyEmailBody = z.infer<typeof VerifyEmailSchema>["body"];
export type ResendVerificationBody = z.infer<
  typeof ResendVerificationSchema
>["body"];
