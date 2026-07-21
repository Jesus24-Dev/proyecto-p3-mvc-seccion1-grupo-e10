import { Router } from "express";
import { PipelineStageController } from "./pipelineStage.controller.js";
import { PipelineStageRepository } from "./pipelineStage.repository.js";
import {
  CreateStageSchema,
  UpdateStageSchema,
  ReorderStagesSchema,
} from "./pipelineStage.schema.js";
import { validate } from "../../shared/validate.js";
import { requireAdmin } from "../Auth/auth.middleware.js";

const router = Router();

const repository = new PipelineStageRepository();
const controller = new PipelineStageController(repository);

router.use(requireAdmin);
router.get("/", controller.list);
router.post("/", validate(CreateStageSchema), controller.create);
router.put("/reorder", validate(ReorderStagesSchema), controller.reorder);
router.put("/:id", validate(UpdateStageSchema), controller.update);
router.delete("/:id", controller.remove);

export const PipelineStageRoutes = router;
