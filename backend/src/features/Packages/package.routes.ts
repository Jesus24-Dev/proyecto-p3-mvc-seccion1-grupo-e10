import { Router } from "express";
import { PackageController } from "./package.controller.js";
import { PackageService } from "./package.service.js";
import { PackageRepository } from "./package.repository.js";
import {
  AddCheckpointSchema,
  CreatePackageSchema,
  MoveStageSchema,
  UpdatePackageSchema,
} from "./package.schema.js";
import { validate } from "../../shared/validate.js";
import { requireAdmin, requireSuperAdmin } from "../Auth/auth.middleware.js";

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
// Eliminar un movimiento del recorrido: solo superadmin.
router.delete('/:id/events/:eventId', requireSuperAdmin, controller.deleteCheckpoint);
router.put('/:id/stage', validate(MoveStageSchema), controller.moveStage);
router.put('/:id', validate(UpdatePackageSchema), controller.updatePackage);
router.delete('/:id', controller.deletePackage);

export const PackageRoutes = router;
