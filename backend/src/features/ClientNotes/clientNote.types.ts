import type { note_kind } from "../../generated/prisma/client.js";

export interface ClientNoteResponse {
  id: string;
  kind: note_kind;
  body: string;
  author_email: string;
  created_at: Date;
  contact_id: string;
}
