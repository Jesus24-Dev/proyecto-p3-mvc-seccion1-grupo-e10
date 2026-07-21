import { Router } from "express";
import { UserController } from "./user.controller.js";
import { UserService } from "./user.service.js";
import { UserRepository } from "./user.repository.js";
import { CreateUserSchema, UpdateUserSchema } from "./user.schema.js";
import { validate } from "../../shared/validate.js";
import { requireAdmin } from "../Auth/auth.middleware.js";

const router = Router();

const repository = new UserRepository();
const service = new UserService(repository);
const controller = new UserController(service);

router.use(requireAdmin);
router.get("/", controller.getUsers);
router.get("/:id", controller.getUserById);
router.post("/", validate(CreateUserSchema), controller.createUser);
router.put("/:id", validate(UpdateUserSchema), controller.updateUser);
router.delete("/:id", controller.deleteUser);

export const UserRoutes = router;
