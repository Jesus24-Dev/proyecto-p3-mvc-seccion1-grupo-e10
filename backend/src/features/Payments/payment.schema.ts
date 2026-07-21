import { z } from "zod";

export const CreatePaymentSchema = z.object({
  body: z
    .object({
      reference: z.optional(z.string()),
      bank: z.optional(z.string()),
      amount: z.coerce
        .number({ message: "El monto debe ser un número." })
        .positive({ message: "El monto debe ser mayor a 0." }),
      paid_at: z.string().min(1, { message: "Indica la fecha del pago." }),
      contact_id: z.guid({ message: "Selecciona un cliente válido." }),
      order_id: z.optional(z.string()),
      package_id: z.optional(z.string()),
      // Medio de pago recibido.
      method: z.enum(["TRANSFER", "MOBILE_PAYMENT", "CASH"]).default("TRANSFER"),
      // Envío pagado (origen) o cobro destino.
      kind: z.enum(["PREPAID", "COLLECT"]).default("PREPAID"),
      note: z.optional(z.string()),
    })
    .refine(
      (data) =>
        // La referencia solo es obligatoria para transferencia y pago móvil.
        data.method === "CASH" || Boolean(data.reference && data.reference.trim()),
      {
        message: "Ingresa la referencia bancaria.",
        path: ["reference"],
      },
    ),
});

export type CreatePaymentBody = z.infer<typeof CreatePaymentSchema>["body"];
