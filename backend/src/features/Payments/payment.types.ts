import type {
  payment_status,
  payment_method,
  payment_kind,
} from "../../generated/prisma/client.js";

export interface PaymentResponse {
  id: string;
  reference: string;
  bank: string;
  amount: number;
  status: payment_status;
  method: payment_method;
  kind: payment_kind;
  paid_at: Date;
  validated_at: Date | null;
  note: string;
  created_at: Date;
  contact_id: string;
  order_id: string | null;
  package_id: string | null;
  contact: { id: string; first_name: string; last_name: string } | null;
  order: { id: string; description: string } | null;
  package: { id: string; tracking_code: string; description: string } | null;
}
