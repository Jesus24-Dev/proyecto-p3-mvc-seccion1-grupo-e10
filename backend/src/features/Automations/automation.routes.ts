import { Router } from "express";
import { AutomationController } from "./automation.controller.js";
import { AutomationService } from "./automation.service.js";
import { AutomationRepository } from "./automation.repository.js";
import {
  CreateAutomationSchema,
  UpdateAutomationSchema,
} from "./automation.schema.js";
import { validate } from "../../shared/validate.js";
import { requireAdmin } from "../Auth/auth.middleware.js";

const router = Router();

const repository = new AutomationRepository();
const service = new AutomationService(repository);
const controller = new AutomationController(service);

router.use(requireAdmin);
router.get('/', controller.getAutomations);
router.get('/:id', controller.getAutomationById);
router.post('/', validate(CreateAutomationSchema), controller.createAutomation);
router.put('/:id', validate(UpdateAutomationSchema), controller.updateAutomation);
router.delete('/:id', controller.deleteAutomation);

export const AutomationRoutes = router;
