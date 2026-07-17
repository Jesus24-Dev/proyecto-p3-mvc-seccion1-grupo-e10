import { z } from "zod";
import { note_kind } from "../../generated/prisma/enums";

export const CreateClientNoteSchema = z.object({
  body: z.object({
    contact_id: z.guid({ message: "Selecciona un cliente válido." }),
    kind: z.optional(z.enum(note_kind)),
    body: z.string().min(1, { message: "Escribe el contenido de la nota." }),
  }),
});

export type CreateClientNoteBody = z.infer<
  typeof CreateClientNoteSchema
>["body"];
