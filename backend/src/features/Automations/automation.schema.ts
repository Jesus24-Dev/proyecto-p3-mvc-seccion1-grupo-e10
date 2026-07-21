import { z } from "zod";

// La definición guarda el lienzo del editor visual (nodos + conexiones,
// formato React Flow). Se valida la forma general; el contenido de cada
// nodo es responsabilidad del editor.
const DefinitionSchema = z.object({
  nodes: z.array(z.record(z.string(), z.unknown())),
  edges: z.array(z.record(z.string(), z.unknown())),
  // Variables personalizadas del flujo (insertables como {{token}}).
  variables: z.optional(z.array(z.string())),
  // Ajustes globales del flujo (p. ej. dominio de envío, número de WhatsApp).
  settings: z.optional(z.record(z.string(), z.unknown())),
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
    // Subcuenta (agencia) dueña del flujo; normalmente la subcuenta activa.
    agency_id: z.optional(z.string()),
  }),
});

export const UpdateAutomationSchema = CreateAutomationSchema;

export type CreateAutomationBody = z.infer<
  typeof CreateAutomationSchema
>["body"];

// Envío de prueba: usado por el editor de flujos y el constructor de correos
// para probar un mensaje real (o simulado) contra una dirección/número.
export const TestSendSchema = z.object({
  body: z.object({
    channel: z.enum([
      "send_email",
      "send_whatsapp",
      "send_instagram",
      "send_messenger",
    ]),
    to: z.string().min(1, { message: "Indica el destinatario de la prueba." }),
    subject: z.optional(z.string()),
    // Texto plano (mensajería) o cuerpo del mensaje.
    message: z.optional(z.string()),
    // HTML ya renderizado (constructor de correos); tiene prioridad para email.
    html: z.optional(z.string()),
  }),
});

export type TestSendBody = z.infer<typeof TestSendSchema>["body"];
