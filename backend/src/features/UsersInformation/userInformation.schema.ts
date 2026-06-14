import { z } from "zod";

export const CreateUserInformationSchema = z.object({
  body: z.object({
    user_id: z.string().guid({
      message: "Ingrese un ID de usuario válido",
    }),
    document_id: z.string().min(3, {
      message: "Ingrese un nombre válido",
    }).max(10, {
      message: "El número de documento no puede exceder los 10 caracteres",
    }),
    first_name: z.string().min(3, {
      message: "Ingrese un nombre válido",
    }),
    last_name: z.string().min(3, {
      message: "Ingrese un nombre válido",
    }),
    address: z.string().min(3, {
      message: "Ingrese un nombre válido",
    }),
    birthday: z.coerce.date(),
    phone: z.string().min(7, {
      message: "Ingrese un número de teléfono válido",
    }).max(15, {
      message: "El número de teléfono no puede exceder los 15 caracteres",
    }).optional(),
  }),
});

export type CreateUserInformationBody = z.infer<
  typeof CreateUserInformationSchema
>["body"];
