import { z } from "zod";

export const CreateTagSchema = z.object({
  body: z.object({
    name: z.string().min(1, { message: "Dale un nombre a la etiqueta." }),
    color: z.optional(z.string()),
    agency_id: z.guid({ message: "Ingrese un ID de agencia válido" }),
  }),
});

export const UpdateTagSchema = z.object({
  body: z.object({
    name: z.string().min(1, { message: "Dale un nombre a la etiqueta." }),
    color: z.optional(z.string()),
  }),
});

export type CreateTagBody = z.infer<typeof CreateTagSchema>["body"];
export type UpdateTagBody = z.infer<typeof UpdateTagSchema>["body"];
