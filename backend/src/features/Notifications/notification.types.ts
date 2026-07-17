import type { notification_kind } from "../../generated/prisma/client.js";

export interface NotificationResponse {
  id: string;
  kind: notification_kind;
  title: string;
  body: string;
  read: boolean;
  entity_id: string | null;
  created_at: Date;
}
