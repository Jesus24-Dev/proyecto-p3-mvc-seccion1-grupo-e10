import { z } from "zod";

// Cuerpo de "Ejecutar": opcionalmente un contacto a inscribir. Si no se
// indica, el servidor toma un contacto de muestra.
export const RunAutomationSchema = z.object({
  body: z.object({
    contact_id: z.optional(z.guid({ message: "Ingrese un ID de contacto válido" })),
  }),
});

export type RunAutomationBody = z.infer<typeof RunAutomationSchema>["body"];
