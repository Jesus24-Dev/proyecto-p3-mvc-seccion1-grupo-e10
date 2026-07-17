import type { Request, Response } from "express";
import { NotificationRepository } from "./notification.repository.js";
import type { NotificationResponse } from "./notification.types.js";
import type { ErrorResponse } from "../../shared/error.responses.types.js";

export class NotificationController {
  constructor(private repository: NotificationRepository) {}

  public getNotifications = async (
    _req: Request,
    res: Response<NotificationResponse[]>,
  ) => {
    const notifications = await this.repository.findRecent();
    return res.status(200).json(notifications);
  };

  public markRead = async (
    req: Request<{ id: string }>,
    res: Response<ErrorResponse | { status: string }>,
  ) => {
    try {
      await this.repository.markRead(req.params.id);
      return res.status(200).json({ status: "ok" });
    } catch {
      return res
        .status(404)
        .json({ status: "error", message: "La notificación no existe." });
    }
  };

  public markAllRead = async (
    _req: Request,
    res: Response<{ status: string }>,
  ) => {
    await this.repository.markAllRead();
    return res.status(200).json({ status: "ok" });
  };
}
