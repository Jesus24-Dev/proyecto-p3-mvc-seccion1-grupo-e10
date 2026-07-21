import { Prisma } from "../../generated/prisma/client.js";
import { OrderRepository } from "./order.repository.js";
import type { CreateOrderBody } from "./order.schema.js";
import type { AgencyScope } from "../Auth/agencyScope.js";

export class OrderService {
  constructor(private orderRepository: OrderRepository) {}

  async getAllOrders(scope?: AgencyScope) {
    return await this.orderRepository.findAll(scope);
  }

  async getOrderById(id: string) {
    return await this.orderRepository.findById(id);
  }

  async createOrder(body: CreateOrderBody) {
    return await this.orderRepository.create(body);
  }

  async updateOrder(id: string, body: CreateOrderBody) {
    try {
      return await this.orderRepository.update(id, body);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2001") {
          throw new Error(`No se encontró orden con ID ${id}`);
        }
      }
    }
  }

  async deleteOrder(id: string) {
    try {
      await this.orderRepository.delete(id);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2001") {
          throw new Error(`No se encontró orden con ID ${id}`);
        }
      }
    }
  }
}
