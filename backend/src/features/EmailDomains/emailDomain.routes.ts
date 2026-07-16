import { Router } from "express";
import { EmailDomainController } from "./emailDomain.controller.js";
import { EmailDomainService } from "./emailDomain.service.js";
import { EmailDomainRepository } from "./emailDomain.repository.js";
import { CreateEmailDomainSchema } from "./emailDomain.schema.js";
import { validate } from "../../shared/validate.js";
import { requireAdmin } from "../Auth/auth.middleware.js";

const router = Router();

const repository = new EmailDomainRepository();
const service = new EmailDomainService(repository);
const controller = new EmailDomainController(service);

router.use(requireAdmin);
router.get("/", controller.getDomains);
router.post("/", validate(CreateEmailDomainSchema), controller.createDomain);
router.post("/:id/verify", controller.verifyDomain);
router.delete("/:id", controller.deleteDomain);

export const EmailDomainRoutes = router;
