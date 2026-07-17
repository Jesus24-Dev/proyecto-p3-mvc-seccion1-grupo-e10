import { Router } from "express";
import { ClientNoteController } from "./clientNote.controller.js";
import { ClientNoteRepository } from "./clientNote.repository.js";
import { CreateClientNoteSchema } from "./clientNote.schema.js";
import { validate } from "../../shared/validate.js";
import { requireAdmin } from "../Auth/auth.middleware.js";

const router = Router();

const repository = new ClientNoteRepository();
const controller = new ClientNoteController(repository);

router.use(requireAdmin);
router.get("/", controller.getNotes);
router.post("/", validate(CreateClientNoteSchema), controller.createNote);
router.delete("/:id", controller.deleteNote);

export const ClientNoteRoutes = router;
