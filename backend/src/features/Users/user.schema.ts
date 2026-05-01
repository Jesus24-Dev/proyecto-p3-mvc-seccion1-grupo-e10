import { z } from "zod";
import { roles } from "../../generated/prisma/client";

export const CreateUserSchema = z.object({
  body: z.object({
    email: z.email("Formato de email inválido."),
    password: z.string().regex(/^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/, {
      message:
        "La contraseña debe tener al menos 8 caracteres, una mayúscula y un número",
    }),
    role: z.enum(roles, {
      error: () => ({ message: "El rol seleccionado no es válido." }),
    }),
  }),
});

export type CreateUserBody = z.infer<typeof CreateUserSchema>["body"];
