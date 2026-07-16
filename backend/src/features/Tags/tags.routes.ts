import { Router } from "express";
import { TagController } from "./tags.controller.js";
import { TagService } from "./tags.service.js";
import { TagRepository } from "./tags.repository.js";
import { CreateTagSchema, UpdateTagSchema } from "./tags.schema.js";
import { validate } from "../../shared/validate.js";
import { requireAdmin } from "../Auth/auth.middleware.js";

const router = Router();

const repository = new TagRepository();
const service = new TagService(repository);
const controller = new TagController(service);

router.use(requireAdmin);
router.get("/", controller.getTags);
router.post("/", validate(CreateTagSchema), controller.createTag);
router.put("/:id", validate(UpdateTagSchema), controller.updateTag);
router.delete("/:id", controller.deleteTag);

export const TagRoutes = router;
