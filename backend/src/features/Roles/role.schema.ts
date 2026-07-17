import { z } from "zod";

export const CreateRoleSchema = z.object({
  body: z.object({
    name: z.string().min(2, { message: "Dale un nombre al rol." }),
    description: z.optional(z.string()),
    permissions: z.optional(z.array(z.string())),
  }),
});

export const UpdateRoleSchema = z.object({
  body: z.object({
    name: z.optional(z.string().min(2)),
    description: z.optional(z.string()),
    permissions: z.optional(z.array(z.string())),
  }),
});

export type CreateRoleBody = z.infer<typeof CreateRoleSchema>["body"];
export type UpdateRoleBody = z.infer<typeof UpdateRoleSchema>["body"];
