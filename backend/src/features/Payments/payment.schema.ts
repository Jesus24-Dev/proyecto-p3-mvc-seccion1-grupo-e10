import { z } from "zod";

export const CreatePaymentSchema = z.object({
  body: z.object({
    reference: z.string().min(1, { message: "Ingresa la referencia bancaria." }),
    bank: z.optional(z.string()),
    amount: z.coerce
      .number({ message: "El monto debe ser un número." })
      .positive({ message: "El monto debe ser mayor a 0." }),
    paid_at: z.string().min(1, { message: "Indica la fecha del pago." }),
    contact_id: z.guid({ message: "Selecciona un cliente válido." }),
    order_id: z.optional(z.string()),
    note: z.optional(z.string()),
  }),
});

export type CreatePaymentBody = z.infer<typeof CreatePaymentSchema>["body"];
