import { Router } from "express";
import { AgencyController } from "./agency.controller.js";
import { AgencyService } from "./agency.service.js";
import { AgencyRepository } from "./agency.repository.js";
import { CreateAgencySchema } from "./agency.schema.js";
import { validate } from "../../shared/validate.js";
import { requireAdmin } from "../Auth/auth.middleware.js";

const router = Router();

const repository = new AgencyRepository();
const service = new AgencyService(repository);
const controller = new AgencyController(service);

router.use(requireAdmin);
router.get('/', controller.getAgencies);
router.get('/:id', controller.getAgencyById);
router.post('/', validate(CreateAgencySchema), controller.createAgency);
router.put('/:id', controller.updateAgency);
router.delete('/:id', controller.deleteAgency);

export const AgencyRoutes = router;
