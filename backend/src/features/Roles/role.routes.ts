import { Router } from "express";
import { RoleController } from "./role.controller.js";
import { RoleService } from "./role.service.js";
import { RoleRepository } from "./role.repository.js";
import { CreateRoleSchema, UpdateRoleSchema } from "./role.schema.js";
import { validate } from "../../shared/validate.js";
import { requireAdmin } from "../Auth/auth.middleware.js";

const router = Router();

const repository = new RoleRepository();
const service = new RoleService(repository);
const controller = new RoleController(service);

router.use(requireAdmin);
router.get("/", controller.getRoles);
router.post("/", validate(CreateRoleSchema), controller.createRole);
router.put("/:id", validate(UpdateRoleSchema), controller.updateRole);
router.delete("/:id", controller.deleteRole);

export const RoleRoutes = router;
