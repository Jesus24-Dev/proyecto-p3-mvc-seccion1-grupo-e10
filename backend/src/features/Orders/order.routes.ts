import { Router } from "express";
import { OrderController } from "./order.controller.js";
import { OrderService } from "./order.service.js";
import { OrderRepository } from "./order.repository.js";
import { CreateOrderSchema } from "./order.schema.js";
import { validate } from "../../shared/validate.js";
import { requireAuth } from "../Auth/auth.middleware.js";

const router = Router();

const repository = new OrderRepository();
const service = new OrderService(repository);
const controller = new OrderController(service);

router.use(requireAuth);
// TODO implementar requireRoles en las demas rutas
router.get('/', controller.getOrders);
router.get('/:id', controller.getOrderById);
router.post('/', validate(CreateOrderSchema), controller.createOrder);
router.put('/:id', controller.updateOrder);
router.delete('/:id', controller.deleteOrder);

export const OrderRoutes = router;
