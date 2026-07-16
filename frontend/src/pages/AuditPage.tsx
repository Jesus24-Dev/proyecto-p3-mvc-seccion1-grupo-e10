import { useMemo, useState } from "react";
import { ScrollText, Search } from "lucide-react";
import { auditApi } from "@/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePageData } from "@/hooks/usePageData";
import { ariaSort, SortButton, useSortable } from "@/hooks/useSortable";
import { cn } from "@/lib/utils";

// Etiqueta y tono legibles para cada acción registrada.
const ACTION_META: Record<string, { label: string; className: string }> = {
  "user.create": { label: "Creó usuario", className: "bg-info text-info-foreground" },
  "user.delete": { label: "Eliminó usuario", className: "bg-destructive/10 text-destructive" },
  "client.create": { label: "Creó cliente", className: "bg-info text-info-foreground" },
  "client.delete": { label: "Eliminó cliente", className: "bg-destructive/10 text-destructive" },
  "package.create": { label: "Registró paquete", className: "bg-info text-info-foreground" },
  "package.status_change": { label: "Cambió estado", className: "bg-warning text-warning-foreground" },
  "payment.create": { label: "Registró pago", className: "bg-info text-info-foreground" },
  "payment.validate": { label: "Validó pago", className: "bg-success text-success-foreground" },
  "payment.reject": { label: "Rechazó pago", className: "bg-destructive/10 text-destructive" },
};

const ENTITY_FILTERS = [
  { value: "ALL", label: "Todo" },
  { value: "user", label: "Usuarios" },
  { value: "client", label: "Clientes" },
  { value: "package", label: "Paquetes" },
  { value: "payment", label: "Pagos" },
];

function actionMeta(action: string) {
  return (
    ACTION_META[action] ?? {
      label: action,
      className: "bg-muted text-muted-foreground",
    }
  );
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AuditPage() {
  const { data: logs, isLoading, error } = usePageData(auditApi.list);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (logs ?? []).filter((log) => {
      if (entityFilter !== "ALL" && log.entity !== entityFilter) {
        return false;
      }
      if (!query) return true;
      return (
        log.user_email.toLowerCase().includes(query) ||
        log.detail.toLowerCase().includes(query) ||
        actionMeta(log.action).label.toLowerCase().includes(query)
      );
    });
  }, [logs, search, entityFilter]);

  const { sorted, sortKey, direction, toggle } = useSortable(filtered, {
    date: (log) => log.created_at,
    user: (log) => log.user_email.toLowerCase(),
    action: (log) => actionMeta(log.action).label.toLowerCase(),
  });

  return (
    <>
      <PageHeader
        title="Auditoría"
        description="Bitácora de acciones críticas del personal: quién hizo qué y cuándo."
      />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por usuario, acción o detalle"
            aria-label="Buscar en la auditoría"
            className="pl-9"
          />
        </div>
        <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
          {ENTITY_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={entityFilter === filter.value}
              onClick={() => setEntityFilter(filter.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                entityFilter === filter.value
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="py-0">
        <CardContent className="px-0">
          {isLoading ? (
            <div className="grid gap-3 p-6">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-11/12" />
              <Skeleton className="h-5 w-4/5" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title={search || entityFilter !== "ALL" ? "Sin resultados" : "Sin registros de auditoría"}
              hint={
                search || entityFilter !== "ALL"
                  ? "Ninguna acción coincide con el filtro."
                  : "Las acciones críticas (altas, cambios de estado, validaciones) aparecerán aquí."
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="pl-6"
                    aria-sort={ariaSort("date", sortKey, direction)}
                  >
                    <SortButton
                      label="Fecha"
                      columnKey="date"
                      sortKey={sortKey}
                      direction={direction}
                      onToggle={toggle}
                    />
                  </TableHead>
                  <TableHead aria-sort={ariaSort("user", sortKey, direction)}>
                    <SortButton
                      label="Usuario"
                      columnKey="user"
                      sortKey={sortKey}
                      direction={direction}
                      onToggle={toggle}
                    />
                  </TableHead>
                  <TableHead aria-sort={ariaSort("action", sortKey, direction)}>
                    <SortButton
                      label="Acción"
                      columnKey="action"
                      sortKey={sortKey}
                      direction={direction}
                      onToggle={toggle}
                    />
                  </TableHead>
                  <TableHead className="hidden pr-6 md:table-cell">
                    Detalle
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((log) => {
                  const meta = actionMeta(log.action);
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="pl-6 whitespace-nowrap text-muted-foreground tabular-nums">
                        {formatDateTime(log.created_at)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.user_email}
                      </TableCell>
                      <TableCell>
                        <Badge className={meta.className}>{meta.label}</Badge>
                      </TableCell>
                      <TableCell className="hidden pr-6 text-sm text-muted-foreground md:table-cell">
                        {log.detail || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
