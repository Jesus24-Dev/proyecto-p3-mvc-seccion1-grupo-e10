import { z } from "zod";

// La definición guarda el lienzo del editor visual (nodos + conexiones,
// formato React Flow). Se valida la forma general; el contenido de cada
// nodo es responsabilidad del editor.
const DefinitionSchema = z.object({
  nodes: z.array(z.record(z.string(), z.unknown())),
  edges: z.array(z.record(z.string(), z.unknown())),
});

export const CreateAutomationSchema = z.object({
  body: z.object({
    name: z.string().min(3, {
      message: "Dale un nombre a la automatización (mínimo 3 caracteres).",
    }),
    description: z.optional(z.string()),
    folder: z.optional(z.string()),
    is_active: z.optional(z.boolean()),
    definition: DefinitionSchema,
  }),
});

export const UpdateAutomationSchema = CreateAutomationSchema;

export type CreateAutomationBody = z.infer<
  typeof CreateAutomationSchema
>["body"];
