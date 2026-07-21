import { z } from "zod";
import { package_status as PrismaPackageStatus } from "../../generated/prisma/enums";

// El tracking_code NO se acepta del cliente: lo genera el servidor.
export const CreatePackageSchema = z.object({
  body: z.object({
    description: z.string().min(3, {
      message: "Describe el contenido del paquete (mínimo 3 caracteres).",
    }),
    weight_kg: z.number().positive({
      message: "El peso debe ser mayor que cero.",
    }),
    dimensions: z.optional(z.string()),
    // Fotos del paquete (URLs o data-URIs).
    image_urls: z.optional(z.array(z.string())),
    contact_id: z.guid({
      message: "Ingrese un ID de contacto válido",
    }),
    order_id: z.optional(
      z.guid({
        message: "Ingrese un ID de envío válido",
      }),
    ),
    status: z.optional(
      z.enum(PrismaPackageStatus, {
        error: () => ({ message: "El estado seleccionado no es válido" }),
      }),
    ),
  }),
});

export const UpdatePackageSchema = CreatePackageSchema;

// Registrar un movimiento (checkpoint) manual en el recorrido del paquete.
export const AddCheckpointSchema = z.object({
  body: z.object({
    status: z.enum(PrismaPackageStatus, {
      error: () => ({ message: "El estado seleccionado no es válido" }),
    }),
    agency_id: z.optional(
      z.guid({
        message: "Ingrese un ID de agencia válido",
      }),
    ),
    note: z.optional(z.string()),
  }),
});

// Mover un paquete a una etapa del pipeline (tablero drag-and-drop).
export const MoveStageSchema = z.object({
  body: z.object({
    stage_id: z.guid({ message: "Ingrese un ID de etapa válido" }),
  }),
});

export type CreatePackageBody = z.infer<typeof CreatePackageSchema>["body"];
export type AddCheckpointBody = z.infer<typeof AddCheckpointSchema>["body"];
export type MoveStageBody = z.infer<typeof MoveStageSchema>["body"];
