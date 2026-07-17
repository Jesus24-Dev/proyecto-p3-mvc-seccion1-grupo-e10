import { prisma } from "../../database/prisma";
import type { notification_kind } from "../../generated/prisma/client.js";

const notificationSelect = {
  id: true,
  kind: true,
  title: true,
  body: true,
  read: true,
  entity_id: true,
  created_at: true,
} as const;

export class NotificationRepository {
  async findRecent() {
    return await prisma.notifications.findMany({
      select: notificationSelect,
      orderBy: { created_at: "desc" },
      take: 50,
    });
  }

  async create(input: {
    kind: notification_kind;
    title: string;
    body?: string;
    entity_id?: string | null;
  }) {
    return await prisma.notifications.create({
      data: {
        kind: input.kind,
        title: input.title,
        body: input.body ?? "",
        entity_id: input.entity_id ?? null,
      },
      select: notificationSelect,
    });
  }

  async markRead(id: string) {
    await prisma.notifications.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllRead() {
    await prisma.notifications.updateMany({
      where: { read: false },
      data: { read: true },
    });
  }
}
