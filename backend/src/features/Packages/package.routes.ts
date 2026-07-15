import { Router } from "express";
import { PackageController } from "./package.controller.js";
import { PackageService } from "./package.service.js";
import { PackageRepository } from "./package.repository.js";
import { CreatePackageSchema, UpdatePackageSchema } from "./package.schema.js";
import { validate } from "../../shared/validate.js";
import { requireAdmin } from "../Auth/auth.middleware.js";

const router = Router();

const repository = new PackageRepository();
const service = new PackageService(repository);
const controller = new PackageController(service);

router.use(requireAdmin);
router.get('/', controller.getPackages);
router.get('/:id', controller.getPackageById);
router.post('/', validate(CreatePackageSchema), controller.createPackage);
router.put('/:id', validate(UpdatePackageSchema), controller.updatePackage);
router.delete('/:id', controller.deletePackage);

export const PackageRoutes = router;
