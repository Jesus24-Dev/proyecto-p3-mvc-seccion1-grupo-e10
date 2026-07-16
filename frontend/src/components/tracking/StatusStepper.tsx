import { Check } from "lucide-react";
import { packageStatusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PackageStatus } from "@/types";

// Recorrido feliz en orden; "Devuelto" es un desenlace aparte.
const FLOW: PackageStatus[] = [
  "RECEIVED",
  "IN_TRANSIT",
  "IN_WAREHOUSE",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

/**
 * Barra de progreso horizontal del estado del paquete. Marca los pasos
 * alcanzados y resalta el actual; si el paquete fue devuelto, lo muestra
 * como estado terminal en rojo.
 */
export function StatusStepper({ status }: { status: PackageStatus }) {
  if (status === "RETURNED") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
        Paquete devuelto al remitente
      </div>
    );
  }

  const currentIndex = FLOW.indexOf(status);

  return (
    <ol className="flex items-center">
      {FLOW.map((step, index) => {
        const reached = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === FLOW.length - 1;
        return (
          <li
            key={step}
            className={cn("flex items-center", !isLast && "flex-1")}
          >
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                  reached
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground",
                  isCurrent && "ring-3 ring-primary/25",
                )}
              >
                {reached && !isCurrent ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cn(
                  "max-w-16 text-center text-xs leading-tight",
                  isCurrent
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {packageStatusLabel(step)}
              </span>
            </div>
            {!isLast && (
              <span
                className={cn(
                  "mx-1 mb-5 h-0.5 flex-1 rounded-full",
                  index < currentIndex ? "bg-primary" : "bg-border",
                )}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
