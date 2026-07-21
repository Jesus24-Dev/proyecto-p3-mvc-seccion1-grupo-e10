import { Prisma } from "../../generated/prisma/client.js";
import { PaymentRepository } from "./payment.repository.js";
import type { CreatePaymentBody } from "./payment.schema.js";
import type { AgencyScope } from "../Auth/agencyScope.js";

export class PaymentServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "PaymentServiceError";
  }
}

export class PaymentService {
  constructor(private paymentRepository: PaymentRepository) {}

  async getAllPayments(scope?: AgencyScope) {
    return await this.paymentRepository.findAll(scope);
  }

  async createPayment(body: CreatePaymentBody) {
    try {
      return await this.paymentRepository.create(body);
    } catch (e) {
      throw this.mapError(e);
    }
  }

  /**
   * Validación automática contra el Banco Mercantil (SIMULADA). En un sistema
   * real se consultaría la API bancaria por la referencia y se cotejaría monto
   * y fecha. Aquí aprobamos si la referencia parece válida y el monto es > 0.
   */
  async validatePayment(id: string) {
    const payment = await this.paymentRepository.findById(id);
    if (!payment) {
      throw new PaymentServiceError("El pago no existe.", 404);
    }
    if (payment.status !== "PENDING") {
      throw new PaymentServiceError("El pago ya fue procesado.", 409);
    }

    // El efectivo no se valida contra el banco: se aprueba directo.
    if (payment.method === "CASH") {
      return await this.paymentRepository.setStatus(
        id,
        "APPROVED",
        "Pago en efectivo confirmado en caja.",
      );
    }

    const referenceFound = /\d{6,}/.test(payment.reference);
    const amountOk = payment.amount > 0;
    const approved = referenceFound && amountOk;

    const channel = payment.method === "MOBILE_PAYMENT" ? "Pago Móvil" : "Banco Mercantil";
    return await this.paymentRepository.setStatus(
      id,
      approved ? "APPROVED" : "REJECTED",
      approved
        ? `Validado automáticamente con ${channel} (simulado).`
        : `${channel} no encontró la referencia o el monto no coincide (simulado).`,
    );
  }

  async rejectPayment(id: string) {
    const payment = await this.paymentRepository.findById(id);
    if (!payment) {
      throw new PaymentServiceError("El pago no existe.", 404);
    }
    return await this.paymentRepository.setStatus(
      id,
      "REJECTED",
      "Rechazado manualmente por un operador.",
    );
  }

  async deletePayment(id: string) {
    try {
      await this.paymentRepository.delete(id);
    } catch (e) {
      throw this.mapError(e);
    }
  }

  private mapError(e: unknown): unknown {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2003") {
        return new PaymentServiceError(
          "El cliente o el envío indicado no existe.",
          400,
        );
      }
      if (e.code === "P2001" || e.code === "P2025") {
        return new PaymentServiceError("El pago solicitado no existe.", 404);
      }
    }
    return e;
  }
}
