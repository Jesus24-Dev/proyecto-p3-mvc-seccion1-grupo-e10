import type { payment_status } from "../../generated/prisma/client.js";

export interface PaymentResponse {
  id: string;
  reference: string;
  bank: string;
  amount: number;
  status: payment_status;
  paid_at: Date;
  validated_at: Date | null;
  note: string;
  created_at: Date;
  contact_id: string;
  order_id: string | null;
  contact: { id: string; first_name: string; last_name: string } | null;
  order: { id: string; description: string } | null;
}
