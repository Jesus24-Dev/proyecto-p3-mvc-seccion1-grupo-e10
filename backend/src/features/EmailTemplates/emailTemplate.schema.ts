import { z } from "zod";

export const CreateEmailTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1, { message: "Dale un nombre a la plantilla." }),
    subject: z.optional(z.string()),
    body: z.optional(z.string()),
    agency_id: z.guid({ message: "Ingrese un ID de agencia válido" }),
  }),
});

export const UpdateEmailTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1, { message: "Dale un nombre a la plantilla." }),
    subject: z.optional(z.string()),
    body: z.optional(z.string()),
  }),
});

export type CreateEmailTemplateBody = z.infer<
  typeof CreateEmailTemplateSchema
>["body"];
export type UpdateEmailTemplateBody = z.infer<
  typeof UpdateEmailTemplateSchema
>["body"];
