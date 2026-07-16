import { Router } from "express";
import { PackageController } from "./package.controller.js";
import { PackageService } from "./package.service.js";
import { PackageRepository } from "./package.repository.js";
import {
  AddCheckpointSchema,
  CreatePackageSchema,
  UpdatePackageSchema,
} from "./package.schema.js";
import { validate } from "../../shared/validate.js";
import { requireAdmin } from "../Auth/auth.middleware.js";

const router = Router();

const repository = new PackageRepository();
const service = new PackageService(repository);
const controller = new PackageController(service);

router.use(requireAdmin);
router.get('/', controller.getPackages);
// Debe ir antes de '/:id' para que "tracking" no se interprete como un id.
router.get('/tracking/:code', controller.getPackageByTrackingCode);
router.get('/:id', controller.getPackageById);
router.post('/', validate(CreatePackageSchema), controller.createPackage);
router.post('/:id/events', validate(AddCheckpointSchema), controller.addCheckpoint);
router.put('/:id', validate(UpdatePackageSchema), controller.updatePackage);
router.delete('/:id', controller.deletePackage);

export const PackageRoutes = router;
