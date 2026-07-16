import { prisma } from "../../database/prisma";
import { payment_status } from "../../generated/prisma/client.js";

const DAY_MS = 24 * 60 * 60 * 1000;

// Pagos de ejemplo con referencias válidas (aprobados), pendientes y uno
// rechazado, para poblar la vista de transacciones y los KPI del panel.
const demoPayments = [
  { reference: "01234567", amount: 42.5, status: payment_status.APPROVED, daysAgo: 1 },
  { reference: "77812345", amount: 18.0, status: payment_status.PENDING, daysAgo: 0 },
  { reference: "REF-XYZ", amount: 25.0, status: payment_status.REJECTED, daysAgo: 2 },
  { reference: "90887766", amount: 60.0, status: payment_status.APPROVED, daysAgo: 3 },
  { reference: "55544433", amount: 12.75, status: payment_status.PENDING, daysAgo: 0 },
  { reference: "31459022", amount: 88.9, status: payment_status.APPROVED, daysAgo: 5 },
];

export async function seedPayments() {
  const contacts = await prisma.users_information.findMany({
    select: { id: true },
    take: 6,
  });
  if (contacts.length === 0) {
    return [];
  }
  const orders = await prisma.orders.findMany({ select: { id: true }, take: 6 });

  // Idempotente: rehace el set de demostración en cada corrida.
  await prisma.transactions.deleteMany();

  const now = Date.now();
  const created = [];
  for (const [i, row] of demoPayments.entries()) {
    const contact = contacts[i % contacts.length];
    if (!contact) {
      continue;
    }
    const paidAt = new Date(now - row.daysAgo * DAY_MS);
    const note =
      row.status === payment_status.APPROVED
        ? "Validado con Banco Mercantil (simulado)."
        : row.status === payment_status.REJECTED
          ? "El banco no encontró la referencia (simulado)."
          : "";
    const transaction = await prisma.transactions.create({
      data: {
        reference: row.reference,
        bank: "Banco Mercantil",
        amount: row.amount,
        status: row.status,
        paid_at: paidAt,
        validated_at: row.status === payment_status.PENDING ? null : paidAt,
        note,
        contact_id: contact.id,
        order_id: orders.length ? (orders[i % orders.length]?.id ?? null) : null,
      },
    });
    created.push(transaction);
  }
  return created;
}
