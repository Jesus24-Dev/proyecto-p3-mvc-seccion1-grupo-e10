import { Router } from "express";
import { NotificationController } from "./notification.controller.js";
import { NotificationRepository } from "./notification.repository.js";
import { requireAdmin } from "../Auth/auth.middleware.js";

const router = Router();

const repository = new NotificationRepository();
const controller = new NotificationController(repository);

router.use(requireAdmin);
router.get("/", controller.getNotifications);
router.post("/:id/read", controller.markRead);
router.post("/read-all", controller.markAllRead);

export const NotificationRoutes = router;
