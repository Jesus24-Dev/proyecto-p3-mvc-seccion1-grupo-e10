import { Router } from "express";
import { AiController } from "./ai.controller.js";
import { AiService } from "./ai.service.js";
import { AiPromptSchema } from "./ai.schema.js";
import { validate } from "../../shared/validate.js";
import { requireAdmin } from "../Auth/auth.middleware.js";

const router = Router();

const service = new AiService();
const controller = new AiController(service);

router.use(requireAdmin);
router.post("/email", validate(AiPromptSchema), controller.generateEmail);
router.post("/workflow", validate(AiPromptSchema), controller.generateWorkflow);

export const AiRoutes = router;
