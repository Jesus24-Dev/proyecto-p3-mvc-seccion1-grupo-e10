import { z } from "zod";

export const CreateAgencySchema = z.object({
  body: z.object({
    name: z.string(),
    location: z.string(),
    is_active: z.optional(z.boolean()),
    user_id: z.guid({
      message: "Ingrese un ID de usuario válido",
    }),
      phone: z.optional(z.string()),
      email: z.optional(z.email({ message: "Ingrese un correo electrónico válido" })),
  }),
});

export type CreateAgencyBody = z.infer<typeof CreateAgencySchema>["body"];
