import { z } from "zod";

export const CreateStageSchema = z.object({
  body: z.object({
    name: z.string().min(2, { message: "Ingresa un nombre para la etapa." }),
    color: z.optional(z.string()),
  }),
});

export const UpdateStageSchema = z.object({
  body: z.object({
    name: z.optional(z.string().min(2, { message: "Nombre demasiado corto." })),
    color: z.optional(z.string()),
    is_active: z.optional(z.boolean()),
  }),
});

export const ReorderStagesSchema = z.object({
  body: z.object({
    ids: z.array(z.string()).min(1, { message: "Envía el orden de las etapas." }),
  }),
});

export type CreateStageBody = z.infer<typeof CreateStageSchema>["body"];
export type UpdateStageBody = z.infer<typeof UpdateStageSchema>["body"];
export type ReorderStagesBody = z.infer<typeof ReorderStagesSchema>["body"];
