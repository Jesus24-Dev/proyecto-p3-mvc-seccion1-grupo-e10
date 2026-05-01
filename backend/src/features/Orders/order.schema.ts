import {z} from 'zod'
import { transfer_status as PrismaStatus } from '../../generated/prisma/enums'

export const CreateOrderSchema = z.object({
    body: z.object({
        user_id: z.string().guid({
            message: "Ingrese un ID de usuario válido"
        }),
        date_arrived: z.coerce.date(),
        date_received: z.coerce.date(),
        origin_agency_id: z.string().guid({
            message: "Ingrese un ID de agencia válido"
        }),
        destination_agency_id: z.string().guid({
            message: "Ingrese un ID de agencia válido"
        }),
        description: z.string(),
        amount: z.number().nonnegative({
            message: "El monto enviado no puede ser negativo"
        }),
        status: z.optional(z.enum(PrismaStatus, {
            error: () => ({message: "El estado seleccionado no es válido"})
        })),
    }),
});

export type CreateOrderBody = z.infer<typeof CreateOrderSchema>['body'];