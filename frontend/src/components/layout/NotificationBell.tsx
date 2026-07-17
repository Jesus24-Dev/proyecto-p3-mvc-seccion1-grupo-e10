import { useState } from "react";
import {
  BadgeCheck,
  Bell,
  Boxes,
  CheckCheck,
  PackageCheck,
  RefreshCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { notificationsApi } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMutationHandler, usePageData } from "@/hooks/usePageData";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NotificationKind } from "@/types";

const KIND_ICON: Record<NotificationKind, LucideIcon> = {
  PAYMENT: BadgeCheck,
  PACKAGE: Boxes,
  STATE: RefreshCw,
  DELIVERY: PackageCheck,
  GENERAL: Bell,
};

export function NotificationBell() {
  const { data, reload } = usePageData(notificationsApi.list);
  const notifications = data ?? [];
  const runMutation = useMutationHandler();
  const [open, setOpen] = useState(false);

  const unread = notifications.filter((item) => !item.read).length;

  async function markRead(id: string) {
    await runMutation(async () => {
      await notificationsApi.markRead(id);
    });
    void reload();
  }

  async function markAllRead() {
    await runMutation(async () => {
      await notificationsApi.markAllRead();
    });
    void reload();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Notificaciones">
            <span className="relative">
              <Bell className="size-5" aria-hidden="true" />
              {unread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </span>
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-medium">Notificaciones</p>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <CheckCheck className="size-3.5" aria-hidden="true" />
              Marcar todas
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Sin notificaciones.
            </p>
          ) : (
            <ul className="divide-y">
              {notifications.map((item) => {
                const Icon = KIND_ICON[item.kind];
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => item.read || void markRead(item.id)}
                      className={cn(
                        "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/60",
                        !item.read && "bg-primary/5",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                          item.read
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary/10 text-primary",
                        )}
                      >
                        <Icon className="size-3.5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {item.title}
                          </span>
                          {!item.read && (
                            <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                          )}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {item.body}
                        </span>
                        <span className="block text-[11px] text-muted-foreground/70">
                          {formatDate(item.created_at)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
