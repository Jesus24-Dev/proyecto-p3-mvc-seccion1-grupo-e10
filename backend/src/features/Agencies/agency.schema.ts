import {z} from 'zod'

export const CreateAgencySchema = z.object({
    body: z.object({
        name: z.string(),
        location: z.string(),
        is_active: z.optional(z.boolean())
    }),
});

export type CreateAgencyBody = z.infer<typeof CreateAgencySchema>['body'];