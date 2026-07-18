import { Router } from "express";
import { SmartListController } from "./smartList.controller.js";
import { SmartListService } from "./smartList.service.js";
import { SmartListRepository } from "./smartList.repository.js";
import {
  CreateSmartListSchema,
  UpdateSmartListSchema,
} from "./smartList.schema.js";
import { validate } from "../../shared/validate.js";
import { requireAdmin } from "../Auth/auth.middleware.js";

const router = Router();

const repository = new SmartListRepository();
const service = new SmartListService(repository);
const controller = new SmartListController(service);

router.use(requireAdmin);
router.get("/", controller.getSmartLists);
router.post("/", validate(CreateSmartListSchema), controller.createSmartList);
router.put("/:id", validate(UpdateSmartListSchema), controller.updateSmartList);
router.delete("/:id", controller.deleteSmartList);

export const SmartListRoutes = router;
