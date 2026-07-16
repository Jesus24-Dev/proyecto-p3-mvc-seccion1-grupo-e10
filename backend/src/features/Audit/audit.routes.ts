import { Router } from "express";
import { AuditController } from "./audit.controller.js";
import { AuditRepository } from "./audit.repository.js";
import { requireAdmin } from "../Auth/auth.middleware.js";

const router = Router();

const repository = new AuditRepository();
const controller = new AuditController(repository);

router.use(requireAdmin);
router.get("/", controller.getAuditLogs);

export const AuditRoutes = router;
