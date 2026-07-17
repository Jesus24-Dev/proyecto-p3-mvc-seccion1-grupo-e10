import { Router } from "express";
import { ConfigController } from "./config.controller.js";
import { ConfigRepository } from "./config.repository.js";
import { UpdateConfigSchema } from "./config.schema.js";
import { validate } from "../../shared/validate.js";
import { requireAdmin } from "../Auth/auth.middleware.js";

const router = Router();

const repository = new ConfigRepository();
const controller = new ConfigController(repository);

router.use(requireAdmin);
router.get("/", controller.getConfig);
router.put("/", validate(UpdateConfigSchema), controller.updateConfig);

export const ConfigRoutes = router;
