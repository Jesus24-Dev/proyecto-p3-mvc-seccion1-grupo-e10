import { z } from "zod";

export const UpdateConfigSchema = z.object({
  body: z.object({
    company_name: z.optional(z.string()),
    company_rif: z.optional(z.string()),
    company_address: z.optional(z.string()),
    company_phone: z.optional(z.string()),
    company_email: z.optional(z.string()),
    sender_email: z.optional(z.string()),
    support_email: z.optional(z.string()),
    bank_api_key: z.optional(z.string()),
    ml_api_key: z.optional(z.string()),
  }),
});

export type UpdateConfigBody = z.infer<typeof UpdateConfigSchema>["body"];
