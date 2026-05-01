import { z } from "zod";

export const CreateUserInformationSchema = z.object({
  body: z.object({
    user_id: z.string().guid({
      message: "Ingrese un ID de usuario válido",
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
  }),
});

export type CreateUserInformationBody = z.infer<
  typeof CreateUserInformationSchema
>["body"];
