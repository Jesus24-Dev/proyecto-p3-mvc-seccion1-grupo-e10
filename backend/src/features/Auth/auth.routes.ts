import { Router } from "express";
import { validate } from "../../shared/validate.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { LoginSchema } from "./auth.schema.js";

const router = Router();

const service = new AuthService();
const controller = new AuthController(service);

router.post("/login", validate(LoginSchema), controller.login);

export const AuthRoutes = router;
