import { Router } from "express";
import { UserController } from "./user.controller.js";
import { UserService } from "./user.service.js";
import { UserRepository } from "./user.repository.js";
import { CreateUserSchema } from "./user.schema.js";
import { validate } from "../../shared/validate.js";
import { requireAuth, requireRoles } from "../Auth/auth.middleware.js";

const router = Router();

const repository = new UserRepository();
const service = new UserService(repository);
const controller = new UserController(service);

router.use(requireAuth);
// TODO implementar requireRoles en las demas rutas
router.get("/", requireRoles(["ADMIN"]), controller.getUsers);
router.get("/:id", controller.getUserById);
router.post("/", validate(CreateUserSchema), controller.createUser);
router.put("/:id", controller.updateUser);
router.delete("/:id", controller.deleteUser);

export const UserRoutes = router;
