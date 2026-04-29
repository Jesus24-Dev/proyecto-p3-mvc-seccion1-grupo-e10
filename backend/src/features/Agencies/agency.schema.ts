import {z} from 'zod'

export const CreateAgencySchema = z.object({
    body: z.object({
        name: z.string(),
        location: z.string(),
        is_active: z.optional(z.boolean()),
        user_id: z.guid({
            message: "Ingrese un ID de usuario valido"
        }),
    }),
});

export type CreateAgencyBody = z.infer<typeof CreateAgencySchema>['body'];