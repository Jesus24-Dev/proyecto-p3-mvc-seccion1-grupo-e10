import { prisma } from "../../database/prisma";
import type { payment_status } from "../../generated/prisma/client.js";
import type { CreatePaymentBody } from "./payment.schema.js";

const paymentSelect = {
  id: true,
  reference: true,
  bank: true,
  amount: true,
  status: true,
  paid_at: true,
  validated_at: true,
  note: true,
  created_at: true,
  contact_id: true,
  order_id: true,
  contact: { select: { id: true, first_name: true, last_name: true } },
  order: { select: { id: true, description: true } },
} as const;

export class PaymentRepository {
  async findAll() {
    return await prisma.transactions.findMany({
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
    return await prisma.transactions.create({
      data: {
        reference: body.reference,
        bank: body.bank?.trim() || "Banco Mercantil",
        amount: body.amount,
        paid_at: new Date(body.paid_at),
        note: body.note ?? "",
        contact_id: body.contact_id,
        order_id: body.order_id ? body.order_id : null,
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
