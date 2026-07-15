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

export type CreatePackageBody = z.infer<typeof CreatePackageSchema>["body"];
