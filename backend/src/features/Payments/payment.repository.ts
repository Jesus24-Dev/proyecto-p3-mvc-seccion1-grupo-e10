import { prisma } from "../../database/prisma";
import type { payment_status } from "../../generated/prisma/client.js";
import type { CreatePaymentBody } from "./payment.schema.js";
import type { AgencyScope } from "../Auth/agencyScope.js";

const paymentSelect = {
  id: true,
  reference: true,
  bank: true,
  amount: true,
  status: true,
  method: true,
  kind: true,
  paid_at: true,
  validated_at: true,
  note: true,
  created_at: true,
  deleted_at: true,
  contact_id: true,
  order_id: true,
  package_id: true,
  contact: { select: { id: true, first_name: true, last_name: true } },
  order: { select: { id: true, description: true } },
  package: { select: { id: true, tracking_code: true, description: true } },
} as const;

export class PaymentRepository {
  async findAll(scope?: AgencyScope) {
    return await prisma.transactions.findMany({
      where: {
        deleted_at: null,
        ...(scope && !scope.all
          ? { contact: { agency_id: { in: scope.ids } } }
          : {}),
      },
      select: paymentSelect,
      orderBy: { created_at: "desc" },
    });
  }

  async findById(id: string) {
    return await prisma.transactions.findUnique({
      where: { id },
      select: paymentSelect,
    });
  }

  async create(body: CreatePaymentBody) {
    // Efectivo: si no hay referencia, se genera una etiqueta legible.
    const reference =
      body.reference?.trim() ||
      (body.method === "CASH" ? `EFECTIVO-${Date.now()}` : "");
    // El "banco" solo aplica a transferencia/pago móvil.
    const bank =
      body.method === "CASH"
        ? "Efectivo"
        : body.bank?.trim() || "Banco Mercantil";
    return await prisma.transactions.create({
      data: {
        reference,
        bank,
        amount: body.amount,
        method: body.method,
        kind: body.kind,
        paid_at: new Date(body.paid_at),
        note: body.note ?? "",
        contact_id: body.contact_id,
        order_id: body.order_id ? body.order_id : null,
        package_id: body.package_id ? body.package_id : null,
      },
      select: paymentSelect,
    });
  }

  async setStatus(id: string, status: payment_status, note: string) {
    return await prisma.transactions.update({
      where: { id },
      data: { status, note, validated_at: new Date() },
      select: paymentSelect,
    });
  }

  async delete(id: string) {
    await prisma.transactions.delete({ where: { id } });
  }
}
