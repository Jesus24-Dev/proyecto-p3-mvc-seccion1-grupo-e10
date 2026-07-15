import type { TransferStatus } from "../types";

const dateFormatter = new Intl.DateTimeFormat("es-VE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const amountFormatter = new Intl.NumberFormat("es-VE", {
  style: "currency",
  currency: "USD",
});

export function formatDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  return Number.isNaN(parsed.getTime()) ? "—" : dateFormatter.format(parsed);
}

export function formatAmount(amount: number): string {
  return amountFormatter.format(amount);
}

/** Convierte un ISO a valor de <input type="date"> (YYYY-MM-DD). */
export function toDateInputValue(isoDate: string): string {
  const parsed = new Date(isoDate);
  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toISOString().slice(0, 10);
}

export const ORDER_STATUSES: TransferStatus[] = [
  "CREATED",
  "PENDING_PAYMENT",
  "IN_REVIEW",
  "PROCESSING",
  "READY_FOR_PICKUP",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
  "REFUNDED",
];

export function orderStatusLabel(status: TransferStatus): string {
  const labels: Record<TransferStatus, string> = {
    CREATED: "Creada",
    PENDING_PAYMENT: "Pago pendiente",
    IN_REVIEW: "En revisión",
    PROCESSING: "Procesando",
    READY_FOR_PICKUP: "Lista para retiro",
    COMPLETED: "Completada",
    CANCELLED: "Cancelada",
    FAILED: "Fallida",
    REFUNDED: "Reembolsada",
  };

  return labels[status];
}

/** Agrupa el estado en un tono semántico para las píldoras de la UI. */
export function orderStatusTone(
  status: TransferStatus,
): "neutral" | "pending" | "success" | "danger" {
  switch (status) {
    case "COMPLETED":
    case "READY_FOR_PICKUP":
      return "success";
    case "CANCELLED":
    case "FAILED":
    case "REFUNDED":
      return "danger";
    case "CREATED":
      return "neutral";
    default:
      return "pending";
  }
}
