import { z } from "zod";

// Una condición del segmento: campo + operador (+ valor opcional).
const ConditionSchema = z.object({
  field: z.string(),
  op: z.string(),
  value: z.optional(z.string()),
});

export const CreateSmartListSchema = z.object({
  body: z.object({
    name: z.string().min(1, { message: "Dale un nombre a la lista." }),
    conditions: z.array(ConditionSchema),
  }),
});

export const UpdateSmartListSchema = CreateSmartListSchema;

export type CreateSmartListBody = z.infer<
  typeof CreateSmartListSchema
>["body"];
