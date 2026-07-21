import { useMemo, useState } from "react";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Info,
  OctagonX,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { notificationsApi } from "@/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageData, useMutationHandler } from "@/hooks/usePageData";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types";

type Level = "success" | "info" | "warning" | "error";

// Severidad derivada del contenido/tipo de la notificación (el modelo no
// guarda un nivel explícito).
function levelOf(notification: AppNotification): Level {
  const text = `${notification.title} ${notification.body}`.toLowerCase();
  if (/fall|error|rechaz|no se pudo|inválid|vacía/.test(text)) {
    return "error";
  }
  if (/pendiente|aviso|espera|vencid/.test(text)) {
    return "warning";
  }
  if (
    notification.kind === "PAYMENT" ||
    notification.kind === "DELIVERY" ||
    /aprobad|validad|entregad|complet/.test(text)
  ) {
    return "success";
  }
  return "info";
}

const LEVEL_META: Record<
  Level,
  { label: string; icon: LucideIcon; chip: string; iconClass: string }
> = {
  success: {
    label: "Éxito",
    icon: CheckCircle2,
    chip: "bg-success/15 text-success-foreground",
    iconClass: "text-success",
  },
  info: {
    label: "Información",
    icon: Info,
    chip: "bg-info/15 text-info-foreground",
    iconClass: "text-info",
  },
  warning: {
    label: "Avisos",
    icon: TriangleAlert,
    chip: "bg-warning/15 text-warning-foreground",
    iconClass: "text-warning",
  },
  error: {
    label: "Errores",
    icon: OctagonX,
    chip: "bg-destructive/15 text-destructive",
    iconClass: "text-destructive",
  },
};

const FILTERS: Array<{ id: "all" | Level; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "success", label: "Éxito" },
  { id: "info", label: "Información" },
  { id: "warning", label: "Avisos" },
  { id: "error", label: "Errores" },
];

export function NotificationsPage() {
  const { data, isLoading, error, reload } = usePageData(notificationsApi.list);
  const notifications = data ?? [];
  const runMutation = useMutationHandler();
  const [filter, setFilter] = useState<"all" | Level>("all");

  const withLevel = useMemo(
    () => notifications.map((n) => ({ ...n, level: levelOf(n) })),
    [notifications],
  );

  const counts = useMemo(() => {
    const base: Record<"all" | Level, number> = {
      all: withLevel.length,
      success: 0,
      info: 0,
      warning: 0,
      error: 0,
    };
    for (const n of withLevel) {
      base[n.level] += 1;
    }
    return base;
  }, [withLevel]);

  const visible = useMemo(
    () => (filter === "all" ? withLevel : withLevel.filter((n) => n.level === filter)),
    [withLevel, filter],
  );

  const unread = notifications.filter((n) => !n.read).length;

  async function markAll() {
    await runMutation(async () => {
      await notificationsApi.markAllRead();
    });
    void reload();
  }

  async function markOne(id: string) {
    await runMutation(async () => {
      await notificationsApi.markRead(id);
    });
    void reload();
  }

  return (
    <>
      <PageHeader
        title="Notificaciones"
        description="Actividad del equipo: pagos, entregas, cambios de estado y automatizaciones."
      >
        <Button variant="outline" onClick={() => void markAll()} disabled={unread === 0}>
          <CheckCheck data-icon="inline-start" aria-hidden="true" />
          Marcar todas como leídas
        </Button>
      </PageHeader>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filtros por severidad */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((option) => {
          const isActive = filter === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => setFilter(option.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50",
              )}
            >
              {option.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs font-semibold tabular-nums",
                  isActive
                    ? "bg-primary-foreground/25 text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                {counts[option.id]}
              </span>
            </button>
          );
        })}
      </div>

      <Card className="py-0">
        <CardContent className="px-0">
          {isLoading ? (
            <div className="grid gap-3 p-6">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-11/12" />
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="Sin notificaciones"
              hint="Cuando ocurra actividad en la red aparecerá aquí."
            />
          ) : (
            <ul className="divide-y">
              {visible.map((n) => {
                const meta = LEVEL_META[n.level];
                const Icon = meta.icon;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => n.read || void markOne(n.id)}
                      className={cn(
                        "flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/50",
                        !n.read && "bg-primary/5",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted",
                          meta.iconClass,
                        )}
                      >
                        <Icon className="size-4.5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{n.title}</span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              meta.chip,
                            )}
                          >
                            {meta.label}
                          </span>
                          {!n.read && (
                            <span
                              className="size-2 rounded-full bg-primary"
                              aria-label="No leída"
                            />
                          )}
                        </span>
                        {n.body && (
                          <span className="mt-0.5 block text-sm text-muted-foreground">
                            {n.body}
                          </span>
                        )}
                        <span className="mt-1 block text-xs text-muted-foreground tabular-nums">
                          {formatDate(n.created_at)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
