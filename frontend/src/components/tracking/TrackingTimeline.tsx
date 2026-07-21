import { MapPin, Trash2 } from "lucide-react";
import { PackageStatusPill } from "@/components/shared/pills";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PackageEvent } from "@/types";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Línea de tiempo vertical del recorrido: cada movimiento con su estado,
 * ubicación (agencia), fecha y nota. El último evento es la ubicación actual.
 */
export function TrackingTimeline({
  events,
  onDelete,
}: {
  events: PackageEvent[];
  /** Si se pasa, muestra un botón para eliminar cada movimiento (superadmin). */
  onDelete?: (eventId: string) => void;
}) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no hay movimientos registrados para este paquete.
      </p>
    );
  }

  const lastIndex = events.length - 1;

  return (
    <ol className="grid gap-0">
      {events.map((event, index) => {
        const isCurrent = index === lastIndex;
        const isFirst = index === 0;
        return (
          <li key={event.id} className="grid grid-cols-[auto_1fr] gap-3">
            {/* Columna del riel: punto + conector. */}
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "mt-1 size-3 shrink-0 rounded-full border-2",
                  isCurrent
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/40 bg-background",
                )}
                aria-hidden="true"
              />
              {!isCurrent && (
                <span
                  className="w-0.5 flex-1 bg-border"
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Contenido del evento. */}
            <div className={cn("pb-5", isFirst && "")}>
              <div className="flex flex-wrap items-center gap-2">
                <PackageStatusPill status={event.status} />
                {isCurrent && (
                  <span className="text-xs font-medium text-primary">
                    Ubicación actual
                  </span>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="ml-auto text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Eliminar este movimiento"
                    title="Eliminar movimiento"
                    onClick={() => onDelete(event.id)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                )}
              </div>
              {event.agency && (
                <p className="mt-1 flex items-center gap-1 text-sm font-medium">
                  <MapPin
                    className="size-3.5 text-muted-foreground"
                    aria-hidden="true"
                  />
                  {event.agency.name}
                  <span className="font-normal text-muted-foreground">
                    · {event.agency.location}
                  </span>
                </p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDateTime(event.created_at)}
              </p>
              {event.note && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {event.note}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
