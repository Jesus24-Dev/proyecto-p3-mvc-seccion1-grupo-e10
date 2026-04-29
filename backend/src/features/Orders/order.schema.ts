import {z} from 'zod'
import { transfer_status as PrismaStatus } from '../../generated/prisma/enums'

export const CreateOrderSchema = z.object({
    body: z.object({
        user_id: z.string().guid({
            message: "Ingrese un ID de usuario valido"
        }),
        date_arrived: z.coerce.date(),
        date_received: z.coerce.date(),
        origin_agency_id: z.string().guid({
            message: "Ingrese un ID de agencia valido"
        }),
        destination_agency_id: z.string().guid({
            message: "Ingrese un ID de agencia valido"
        }),
        description: z.string(),
        amount: z.number().nonnegative({
            message: "El monto enviado no puede ser negativo"
        }),
        status: z.optional(z.enum(PrismaStatus, {
            error: () => ({message: "El estado seleccionado no es valido"})
        })),
    }),
});

export type CreateOrderBody = z.infer<typeof CreateOrderSchema>['body'];