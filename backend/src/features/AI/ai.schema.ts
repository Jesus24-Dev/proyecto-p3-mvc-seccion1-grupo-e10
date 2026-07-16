import { z } from "zod";

export const AiPromptSchema = z.object({
  body: z.object({
    prompt: z.string().min(3, {
      message: "Describe lo que quieres generar (mínimo 3 caracteres).",
    }),
  }),
});

export type AiPromptBody = z.infer<typeof AiPromptSchema>["body"];
