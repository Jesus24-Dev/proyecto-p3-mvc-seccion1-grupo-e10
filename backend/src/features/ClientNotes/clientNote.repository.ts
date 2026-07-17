import { prisma } from "../../database/prisma";
import type { note_kind } from "../../generated/prisma/client.js";

const noteSelect = {
  id: true,
  kind: true,
  body: true,
  author_email: true,
  created_at: true,
  contact_id: true,
} as const;

export class ClientNoteRepository {
  async findByContact(contactId: string) {
    return await prisma.client_notes.findMany({
      where: { contact_id: contactId },
      select: noteSelect,
      orderBy: { created_at: "desc" },
    });
  }

  async create(input: {
    contact_id: string;
    kind: note_kind;
    body: string;
    author_email: string;
  }) {
    return await prisma.client_notes.create({
      data: {
        contact_id: input.contact_id,
        kind: input.kind,
        body: input.body,
        author_email: input.author_email,
      },
      select: noteSelect,
    });
  }

  async delete(id: string) {
    await prisma.client_notes.delete({ where: { id } });
  }
}
