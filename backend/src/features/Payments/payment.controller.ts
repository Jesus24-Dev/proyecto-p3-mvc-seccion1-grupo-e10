import type { Request, Response } from "express";
import { PaymentService, PaymentServiceError } from "./payment.service.js";
import type { PaymentResponse } from "./payment.types.js";
import type { ErrorResponse } from "../../shared/error.responses.types.js";
import type { CreatePaymentBody } from "./payment.schema.js";
import { recordAudit } from "../Audit/audit.helper.js";

export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  public getPayments = async (
    _req: Request,
    res: Response<PaymentResponse[]>,
  ) => {
    const payments = await this.paymentService.getAllPayments();
    return res.status(200).json(payments as PaymentResponse[]);
  };

  public createPayment = async (
    req: Request<{}, {}, CreatePaymentBody>,
    res: Response<PaymentResponse | ErrorResponse>,
  ) => {
    try {
      const payment = await this.paymentService.createPayment(req.body);
      await recordAudit(req, {
        action: "payment.create",
        entity: "payment",
        entity_id: payment.id,
        detail: `Registró el pago ${payment.reference} por ${payment.amount}`,
      });
      return res.status(201).json(payment as PaymentResponse);
    } catch (error) {
      return this.fail(res, error, "No se pudo registrar el pago.");
    }
  };

  public validatePayment = async (
    req: Request<{ id: string }>,
    res: Response<PaymentResponse | ErrorResponse>,
  ) => {
    try {
      const payment = await this.paymentService.validatePayment(req.params.id);
      await recordAudit(req, {
        action: "payment.validate",
        entity: "payment",
        entity_id: payment.id,
        detail: `Validó el pago ${payment.reference}: ${payment.status}`,
      });
      return res.status(200).json(payment as PaymentResponse);
    } catch (error) {
      return this.fail(res, error, "No se pudo validar el pago.");
    }
  };

  public rejectPayment = async (
    req: Request<{ id: string }>,
    res: Response<PaymentResponse | ErrorResponse>,
  ) => {
    try {
      const payment = await this.paymentService.rejectPayment(req.params.id);
      await recordAudit(req, {
        action: "payment.reject",
        entity: "payment",
        entity_id: payment.id,
        detail: `Rechazó el pago ${payment.reference}`,
      });
      return res.status(200).json(payment as PaymentResponse);
    } catch (error) {
      return this.fail(res, error, "No se pudo rechazar el pago.");
    }
  };

  public deletePayment = async (
    req: Request<{ id: string }>,
    res: Response<ErrorResponse>,
  ) => {
    try {
      await this.paymentService.deletePayment(req.params.id);
      return res.status(204).json();
    } catch (error) {
      return this.fail(res, error, "No se pudo eliminar el pago.");
    }
  };

  private fail(res: Response, error: unknown, fallback: string) {
    if (error instanceof PaymentServiceError) {
      return res
        .status(error.statusCode)
        .json({ status: "error", message: error.message });
    }
    return res.status(400).json({ status: "error", message: fallback });
  }
}
