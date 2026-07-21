import { z } from "zod";

export const CreateUserInformationSchema = z.object({
  body: z.object({
    // Cuenta existente a la que se vincula la ficha. Opcional: si no llega,
    // el backend crea una cuenta de respaldo para el contacto (contacto suelto).
    user_id: z
      .string()
      .guid({ message: "Ingrese un ID de usuario válido" })
      .optional(),
    // Agencia (subcuenta) dueña del contacto. Se envía la subcuenta activa.
    agency_id: z
      .string()
      .guid({ message: "Seleccione una agencia válida" })
      .optional(),
    // Correo del contacto (opcional). Solo se usa al crear un contacto suelto
    // para la cuenta de respaldo; si no llega, se genera uno automáticamente.
    email: z
      .union([z.string().email({ message: "Ingrese un correo válido" }), z.literal("")])
      .optional(),
    first_name: z.string().min(3, {
      message: "Ingrese un nombre válido",
    }),
    last_name: z.string().min(3, {
      message: "Ingrese un nombre válido",
    }),
    document_id: z.optional(z.string()),
    phone: z.optional(z.string()),
    address: z.string().min(3, {
      message: "Ingrese un nombre válido",
    }),
    birthday: z.coerce.date(),
  }),
});

export type CreateUserInformationBody = z.infer<
  typeof CreateUserInformationSchema
>["body"];
