import type { Request, Response } from "express";
import { ClientNoteRepository } from "./clientNote.repository.js";
import type { ClientNoteResponse } from "./clientNote.types.js";
import type { ErrorResponse } from "../../shared/error.responses.types.js";
import type { CreateClientNoteBody } from "./clientNote.schema.js";
import { getAuthUser } from "../Auth/auth.middleware.js";

export class ClientNoteController {
  constructor(private repository: ClientNoteRepository) {}

  public getNotes = async (
    req: Request,
    res: Response<ClientNoteResponse[] | ErrorResponse>,
  ) => {
    const contactId = req.query.contact_id;
    if (typeof contactId !== "string" || !contactId) {
      return res
        .status(400)
        .json({ status: "error", message: "Falta el contact_id." });
    }
    const notes = await this.repository.findByContact(contactId);
    return res.status(200).json(notes as ClientNoteResponse[]);
  };

  public createNote = async (
    req: Request<{}, {}, CreateClientNoteBody>,
    res: Response<ClientNoteResponse | ErrorResponse>,
  ) => {
    try {
      const note = await this.repository.create({
        contact_id: req.body.contact_id,
        kind: req.body.kind ?? "NOTE",
        body: req.body.body,
        author_email: getAuthUser(req)?.email ?? "",
      });
      return res.status(201).json(note as ClientNoteResponse);
    } catch {
      return res.status(400).json({
        status: "error",
        message: "No se pudo guardar la nota. Revisa los datos.",
      });
    }
  };

  public deleteNote = async (
    req: Request<{ id: string }>,
    res: Response<ErrorResponse>,
  ) => {
    try {
      await this.repository.delete(req.params.id);
      return res.status(204).json();
    } catch {
      return res.status(404).json({
        status: "error",
        message: "No se pudo eliminar: la nota no existe.",
      });
    }
  };
}
