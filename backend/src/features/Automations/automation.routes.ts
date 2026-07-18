import { Router } from "express";
import { AutomationController } from "./automation.controller.js";
import { AutomationService } from "./automation.service.js";
import { AutomationRepository } from "./automation.repository.js";
import {
  CreateAutomationSchema,
  UpdateAutomationSchema,
} from "./automation.schema.js";
import { RunAutomationSchema } from "./run.schema.js";
import { validate } from "../../shared/validate.js";
import { requireAdmin, requireAdminQueryToken } from "../Auth/auth.middleware.js";

const router = Router();

const repository = new AutomationRepository();
const service = new AutomationService(repository);
const controller = new AutomationController(service);

// SSE de ejecución en vivo. Se registra ANTES del requireAdmin general porque
// EventSource no envía cabeceras: se autentica con ?token= en su lugar.
router.get('/:id/stream', requireAdminQueryToken, controller.streamAutomation);

router.use(requireAdmin);
router.get('/', controller.getAutomations);
router.get('/contact/:contactId/runs', controller.listRunsByContact);
router.get('/:id', controller.getAutomationById);
router.get('/:id/runs', controller.listRuns);
router.post('/', validate(CreateAutomationSchema), controller.createAutomation);
router.post('/:id/run', validate(RunAutomationSchema), controller.runAutomation);
router.post('/:id/runs/:runId/retry', controller.retryRun);
router.put('/:id', validate(UpdateAutomationSchema), controller.updateAutomation);
router.delete('/:id', controller.deleteAutomation);

export const AutomationRoutes = router;

// Router PÚBLICO para webhooks entrantes: los sistemas externos disparan
// una automatización sin token de administrador. Solo acepta POST al
// identificador exacto del flujo, que actúa como secreto compartido.
const hookRouter = Router();
hookRouter.post('/automations/:id', controller.triggerAutomation);

export const AutomationHookRoutes = hookRouter;
