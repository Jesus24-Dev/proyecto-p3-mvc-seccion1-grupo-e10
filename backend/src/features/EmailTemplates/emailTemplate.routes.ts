import { Router } from "express";
import { EmailTemplateController } from "./emailTemplate.controller.js";
import { EmailTemplateService } from "./emailTemplate.service.js";
import { EmailTemplateRepository } from "./emailTemplate.repository.js";
import {
  CreateEmailTemplateSchema,
  UpdateEmailTemplateSchema,
} from "./emailTemplate.schema.js";
import { validate } from "../../shared/validate.js";
import { requireAdmin } from "../Auth/auth.middleware.js";

const router = Router();

const repository = new EmailTemplateRepository();
const service = new EmailTemplateService(repository);
const controller = new EmailTemplateController(service);

router.use(requireAdmin);
router.get("/", controller.getTemplates);
router.post("/", validate(CreateEmailTemplateSchema), controller.createTemplate);
router.put("/:id", validate(UpdateEmailTemplateSchema), controller.updateTemplate);
router.delete("/:id", controller.deleteTemplate);

export const EmailTemplateRoutes = router;
