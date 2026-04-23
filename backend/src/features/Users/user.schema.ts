import {z} from 'zod';
import { roles } from "../../generated/prisma/client";

export const CreateUserSchema = z.object({
    body: z.object({
        email: z.email("Formato de email invalido."),
        password: z.string().regex(/^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/),
        role: z.enum(roles, {
            error: () => ({message: "El rol seleccionado no es valido."})
        })
    })
});


export type CreateUserBody = z.infer<typeof CreateUserSchema>['body'];