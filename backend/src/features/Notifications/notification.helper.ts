import type { notification_kind } from "../../generated/prisma/client.js";
import { NotificationRepository } from "./notification.repository.js";

const repository = new NotificationRepository();

export interface NotifyInput {
  kind: notification_kind;
  title: string;
  body?: string;
  entity_id?: string | null;
}

/**
 * Emite una notificación interna. Nunca lanza: un fallo al notificar no debe
 * romper la operación principal.
 */
export async function notify(input: NotifyInput) {
  try {
    await repository.create(input);
  } catch (error) {
    console.error("No se pudo crear la notificación:", error);
  }
}
