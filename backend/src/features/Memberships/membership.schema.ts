import { z } from "zod";
import { agency_role as PrismaAgencyRole } from "../../generated/prisma/enums";

export const CreateMembershipSchema = z.object({
  body: z.object({
    agency_id: z.guid({
      message: "Ingrese un ID de agencia válido",
    }),
    user_id: z.guid({
      message: "Ingrese un ID de usuario válido",
    }),
    role: z.optional(
      z.enum(PrismaAgencyRole, {
        error: () => ({ message: "El rol de agencia seleccionado no es válido" }),
      }),
    ),
  }),
});

export const UpdateMembershipSchema = z.object({
  body: z.object({
    role: z.enum(PrismaAgencyRole, {
      error: () => ({ message: "El rol de agencia seleccionado no es válido" }),
    }),
  }),
});

export type CreateMembershipBody = z.infer<
  typeof CreateMembershipSchema
>["body"];
export type UpdateMembershipBody = z.infer<
  typeof UpdateMembershipSchema
>["body"];
