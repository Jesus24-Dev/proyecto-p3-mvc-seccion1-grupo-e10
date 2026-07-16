import { CheckCircle2, Clock, LogOut, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

// NOTA: estas vistas son solo de interfaz. El motor de ejecución de flujos
// está fuera del alcance de esta entrega, así que los datos son de ejemplo
// para mostrar cómo se verían el historial de inscripciones y los registros.

type EnrollmentStatus = "active" | "completed" | "exited";

const ENROLLMENTS: {
  contact: string;
  enrolled: string;
  step: string;
  status: EnrollmentStatus;
}[] = [
  { contact: "María Fernández", enrolled: "Hoy · 10:32", step: "Esperar 1 día", status: "active" },
  { contact: "José Rodríguez", enrolled: "Hoy · 09:15", step: "Finalizado", status: "completed" },
  { contact: "Carla Méndez", enrolled: "Ayer · 18:40", step: "Enviar WhatsApp", status: "active" },
  { contact: "Luis Pereira", enrolled: "Ayer · 12:03", step: "Condición · rama No", status: "exited" },
  { contact: "Ana Salazar", enrolled: "12 jul · 08:20", step: "Finalizado", status: "completed" },
  { contact: "Pedro Gómez", enrolled: "11 jul · 16:55", step: "Agregar etiqueta", status: "active" },
];

const ENROLLMENT_META: Record<
  EnrollmentStatus,
  { label: string; className: string }
> = {
  active: { label: "En curso", className: "bg-info text-info-foreground" },
  completed: { label: "Completada", className: "bg-success text-success-foreground" },
  exited: { label: "Salió", className: "bg-muted text-muted-foreground" },
};

type LogResult = "ok" | "error";

const LOGS: {
  time: string;
  contact: string;
  step: string;
  result: LogResult;
  detail: string;
}[] = [
  { time: "10:32:04", contact: "María Fernández", step: "Disparador · Contacto creado", result: "ok", detail: "Inscrita en el flujo" },
  { time: "10:32:05", contact: "María Fernández", step: "Enviar WhatsApp", result: "ok", detail: "Mensaje encolado" },
  { time: "10:33:11", contact: "José Rodríguez", step: "Agregar etiqueta #bienvenida", result: "ok", detail: "Etiqueta aplicada" },
  { time: "10:34:47", contact: "Carla Méndez", step: "Esperar 1 día", result: "ok", detail: "Espera iniciada" },
  { time: "10:35:22", contact: "Luis Pereira", step: "Enviar webhook", result: "error", detail: "Tiempo de espera agotado (504)" },
  { time: "10:36:09", contact: "Ana Salazar", step: "Enviar email · Bienvenida", result: "ok", detail: "Entregado" },
];

function DemoBanner() {
  return (
    <p className="mb-4 rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      Vista de demostración: el motor de ejecución está fuera del alcance de esta
      entrega, así que estos datos son de ejemplo.
    </p>
  );
}

export function EnrollmentHistory({ saved }: { saved: boolean }) {
  if (!saved) {
    return (
      <EmptyState
        icon={Clock}
        title="Aún sin inscripciones"
        hint="Guarda la automatización para empezar a inscribir contactos y ver su recorrido aquí."
      />
    );
  }
  return (
    <div>
      <DemoBanner />
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contacto</TableHead>
              <TableHead>Inscrito</TableHead>
              <TableHead>Paso actual</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ENROLLMENTS.map((row) => {
              const meta = ENROLLMENT_META[row.status];
              return (
                <TableRow key={row.contact}>
                  <TableCell className="font-medium">{row.contact}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {row.enrolled}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.step}</TableCell>
                  <TableCell>
                    <Badge className={cn("gap-1", meta.className)}>
                      {row.status === "completed" && (
                        <CheckCircle2 className="size-3" aria-hidden="true" />
                      )}
                      {row.status === "exited" && (
                        <LogOut className="size-3" aria-hidden="true" />
                      )}
                      {row.status === "active" && (
                        <Clock className="size-3" aria-hidden="true" />
                      )}
                      {meta.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function ExecutionLogs({ saved }: { saved: boolean }) {
  if (!saved) {
    return (
      <EmptyState
        icon={Clock}
        title="Aún sin registros"
        hint="Cuando la automatización se ejecute, cada paso quedará registrado aquí."
      />
    );
  }
  return (
    <div>
      <DemoBanner />
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
            {LOGS.map((row, index) => (
              <TableRow key={`${row.time}-${index}`}>
                <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                  {row.time}
                </TableCell>
                <TableCell className="font-medium">{row.contact}</TableCell>
                <TableCell className="text-muted-foreground">{row.step}</TableCell>
                <TableCell>
                  {row.result === "ok" ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-success-foreground">
                      <CheckCircle2 className="size-3.5" aria-hidden="true" />
                      {row.detail}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm text-destructive">
                      <XCircle className="size-3.5" aria-hidden="true" />
                      {row.detail}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
