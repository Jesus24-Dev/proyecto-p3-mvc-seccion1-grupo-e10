import { Router } from "express";
import { PaymentController } from "./payment.controller.js";
import { PaymentService } from "./payment.service.js";
import { PaymentRepository } from "./payment.repository.js";
import { CreatePaymentSchema } from "./payment.schema.js";
import { validate } from "../../shared/validate.js";
import { requireAdmin } from "../Auth/auth.middleware.js";

const router = Router();

const repository = new PaymentRepository();
const service = new PaymentService(repository);
const controller = new PaymentController(service);

router.use(requireAdmin);
router.get("/", controller.getPayments);
router.post("/", validate(CreatePaymentSchema), controller.createPayment);
router.post("/:id/validate", controller.validatePayment);
router.post("/:id/reject", controller.rejectPayment);
router.delete("/:id", controller.deletePayment);

export const PaymentRoutes = router;
