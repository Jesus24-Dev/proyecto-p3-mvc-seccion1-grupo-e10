import { CheckCircle2, Clock, LogOut, RotateCcw, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/EmptyState";
import { STEP_META, type StepKind } from "@/lib/automationSteps";
import { cn } from "@/lib/utils";
import type { AutomationRun, AutomationRunEvent } from "@/types";

// Estas vistas muestran la ejecución REAL de un flujo: el historial de
// inscripciones (un contacto por fila) y el registro paso a paso.

type EnrollmentStatus = "active" | "completed" | "exited";

const ENROLLMENT_META: Record<
  EnrollmentStatus,
  { label: string; className: string }
> = {
  active: { label: "En curso", className: "bg-info text-info-foreground" },
  completed: {
    label: "Completada",
    className: "bg-success text-success-foreground",
  },
  exited: { label: "Salió", className: "bg-muted text-muted-foreground" },
};

function enrollmentStatus(status: AutomationRun["status"]): EnrollmentStatus {
  if (status === "RUNNING" || status === "WAITING") {
    return "active";
  }
  if (status === "COMPLETED") {
    return "completed";
  }
  return "exited"; // EXITED / FAILED
}

// Etiqueta legible de un paso a partir de su StepKind.
function kindLabel(kind: string): string {
  return STEP_META[kind as StepKind]?.label ?? (kind ? kind : "Flujo");
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatEnrolled(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("es-VE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Paso actual (o resultado) de un contacto, a partir de su último evento.
function currentStep(run: AutomationRun): string {
  if (run.status === "COMPLETED") {
    return "Finalizado";
  }
  const last = run.events[run.events.length - 1];
  return last?.detail || kindLabel(last?.kind ?? "");
}

export function EnrollmentHistory({
  runs,
  onRetry,
}: {
  runs: AutomationRun[];
  onRetry?: (runId: string, mode: "full" | "failed") => void;
}) {
  if (runs.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="Aún sin inscripciones"
        hint="Ejecuta la automatización (o deja que un disparador la active) para ver aquí el recorrido de cada contacto."
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Contacto</TableHead>
            <TableHead>Inscrito</TableHead>
            <TableHead>Paso actual</TableHead>
            <TableHead>Estado</TableHead>
            {onRetry && <TableHead className="text-right">Reintentar</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => {
            const status = enrollmentStatus(run.status);
            const meta = ENROLLMENT_META[status];
            const hasFailed = run.events.some((e) => e.result === "ERROR");
            const isLive = run.status === "RUNNING" || run.status === "WAITING";
            return (
              <TableRow key={run.id}>
                <TableCell className="font-medium">{run.contact_name}</TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {formatEnrolled(run.started_at)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {currentStep(run)}
                </TableCell>
                <TableCell>
                  <Badge className={cn("gap-1", meta.className)}>
                    {status === "completed" && (
                      <CheckCircle2 className="size-3" aria-hidden="true" />
                    )}
                    {status === "exited" && (
                      <LogOut className="size-3" aria-hidden="true" />
                    )}
                    {status === "active" && (
                      <Clock className="size-3" aria-hidden="true" />
                    )}
                    {meta.label}
                  </Badge>
                </TableCell>
                {onRetry && (
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={isLive}
                            aria-label={`Reintentar la ejecución de ${run.contact_name}`}
                          >
                            <RotateCcw aria-hidden="true" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Reintentar</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onRetry(run.id, "full")}>
                          Todo el flujo (nueva ejecución)
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!hasFailed}
                          onClick={() => onRetry(run.id, "failed")}
                        >
                          Solo los pasos fallidos
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

type LogRow = AutomationRunEvent & { contact_name: string };

export function ExecutionLogs({ runs }: { runs: AutomationRun[] }) {
  // Aplana los eventos de todas las ejecuciones, más recientes primero.
  const rows: LogRow[] = runs
    .flatMap((run) =>
      run.events.map((event) => ({ ...event, contact_name: run.contact_name })),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="Aún sin registros"
        hint="Cuando la automatización se ejecute, cada paso quedará registrado aquí en tiempo real."
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Hora</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead>Paso</TableHead>
            <TableHead>Resultado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                {formatTime(row.created_at)}
              </TableCell>
              <TableCell className="font-medium">{row.contact_name}</TableCell>
              <TableCell className="text-muted-foreground">
                {kindLabel(row.kind)}
              </TableCell>
              <TableCell>
                {row.result === "OK" ? (
                  <span className="inline-flex items-center gap-1.5 text-sm text-success-foreground">
                    <CheckCircle2 className="size-3.5" aria-hidden="true" />
                    {row.detail}
                  </span>
                ) : row.result === "ERROR" ? (
                  <span className="inline-flex items-center gap-1.5 text-sm text-destructive">
                    <XCircle className="size-3.5" aria-hidden="true" />
                    {row.detail}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="size-3.5" aria-hidden="true" />
                    {row.detail}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
