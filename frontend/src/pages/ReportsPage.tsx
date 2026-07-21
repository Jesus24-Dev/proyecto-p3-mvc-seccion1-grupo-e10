import { useMemo, useState } from "react";
import {
  BadgeDollarSign,
  CalendarDays,
  Download,
  FileSpreadsheet,
  Package,
  Printer,
  Receipt,
  TrendingUp,
  Truck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { contactsApi, packagesApi, paymentsApi } from "@/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { PackageStatusPill } from "@/components/shared/pills";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  PACKAGE_STATUSES,
  formatAmount,
  formatDate,
  packageStatusLabel,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PackageStatus, PaymentStatus } from "@/types";

type ReportKey =
  | "clients"
  | "packages"
  | "transactions"
  | "deliveries"
  | "revenue";

// Tipo de columna: define alineación y estilo de la celda (código monoespaciado,
// monto enfatizado, insignia de estado…). Las exportaciones siguen usando texto.
type ColumnKind =
  | "text"
  | "mono"
  | "amount"
  | "count"
  | "package-status"
  | "payment-status";

interface ReportColumn {
  label: string;
  kind?: ColumnKind;
}

interface Report {
  key: ReportKey;
  label: string;
  icon: LucideIcon;
  columns: ReportColumn[];
  rows: string[][];
  summary: string;
}

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
};

// Tono de la insignia por estado de pago (mismos tonos que las píldoras).
const PAYMENT_TONE: Record<PaymentStatus, string> = {
  PENDING: "bg-warning text-warning-foreground",
  APPROVED: "bg-success text-success-foreground",
  REJECTED: "bg-destructive/10 text-destructive",
};

// Mapas inversos etiqueta → clave, para reconstruir la insignia desde el texto
// de la celda (que ya viene localizado para las exportaciones).
const PACKAGE_STATUS_BY_LABEL = new Map<string, PackageStatus>(
  PACKAGE_STATUSES.map((status) => [packageStatusLabel(status), status]),
);
const PAYMENT_STATUS_BY_LABEL = new Map<string, PaymentStatus>(
  (Object.keys(PAYMENT_LABEL) as PaymentStatus[]).map((status) => [
    PAYMENT_LABEL[status],
    status,
  ]),
);

// Columnas numéricas: se alinean a la derecha y usan cifras tabulares.
function isNumericColumn(kind: ColumnKind | undefined): boolean {
  return kind === "amount" || kind === "count";
}

// Clase de la celda (columnas no iniciales) según el tipo de columna.
function cellClass(kind: ColumnKind | undefined): string {
  switch (kind) {
    case "mono":
      return "font-mono text-xs text-foreground";
    case "amount":
      return "font-medium text-foreground";
    case "count":
      return "text-foreground";
    case "package-status":
    case "payment-status":
      return "";
    default:
      return "text-muted-foreground";
  }
}

// Renderiza la celda: insignias para estados, texto para el resto.
function renderReportCell(kind: ColumnKind | undefined, value: string) {
  if (kind === "package-status") {
    const status = PACKAGE_STATUS_BY_LABEL.get(value);
    return status ? <PackageStatusPill status={status} /> : value;
  }
  if (kind === "payment-status") {
    const status = PAYMENT_STATUS_BY_LABEL.get(value);
    return status ? (
      <Badge className={PAYMENT_TONE[status]}>{value}</Badge>
    ) : (
      value
    );
  }
  return value;
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportCsv(report: Report) {
  const headers = report.columns.map((column) => column.label);
  const lines = [headers, ...report.rows].map((row) =>
    row.map(escapeCsv).join(","),
  );
  // BOM para que Excel respete los acentos.
  download(
    `reporte-${report.key}.csv`,
    "﻿" + lines.join("\n"),
    "text/csv;charset=utf-8",
  );
}

function exportExcel(report: Report) {
  const head = report.columns.map((c) => `<th>${c.label}</th>`).join("");
  const body = report.rows
    .map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("");
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8" /></head><body><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
  download(
    `reporte-${report.key}.xls`,
    html,
    "application/vnd.ms-excel;charset=utf-8",
  );
}

function printReport(report: Report) {
  const head = report.columns.map((c) => `<th>${c.label}</th>`).join("");
  const body = report.rows
    .map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("");
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8" />
    <title>Reporte · ${report.label}</title>
    <style>
      body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; padding: 32px; color: #1f2937; }
      h1 { font-size: 18px; margin: 0 0 4px; }
      p.sub { color: #6b7280; margin: 0 0 20px; font-size: 13px; }
      table { border-collapse: collapse; width: 100%; font-size: 12px; }
      th, td { border: 1px solid #e5e7eb; padding: 6px 10px; text-align: left; }
      th { background: #f3f4f6; }
    </style></head><body>
    <h1>Dr Logistics · ${report.label}</h1>
    <p class="sub">${report.summary}</p>
    <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
    </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

export function ReportsPage() {
  const { data, isLoading, error } = usePageData(() =>
    Promise.all([contactsApi.list(), packagesApi.list(), paymentsApi.list()]),
  );
  const allContacts = data?.[0] ?? [];
  const allPackages = data?.[1] ?? [];
  const allPayments = data?.[2] ?? [];

  const [active, setActive] = useState<ReportKey>("clients");
  // Filtro por rango de fechas (YYYY-MM-DD, vacío = sin límite).
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const inRange = useMemo(() => {
    const fromTs = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toTs = to ? new Date(`${to}T23:59:59`).getTime() : null;
    return (iso: string) => {
      const ts = new Date(iso).getTime();
      if (fromTs !== null && ts < fromTs) return false;
      if (toTs !== null && ts > toTs) return false;
      return true;
    };
  }, [from, to]);

  // Datos acotados al rango (cada entidad por su fecha relevante).
  const contacts = useMemo(
    () => allContacts.filter((c) => inRange(c.created_at)),
    [allContacts, inRange],
  );
  const packages = useMemo(
    () => allPackages.filter((p) => inRange(p.created_at)),
    [allPackages, inRange],
  );
  const payments = useMemo(
    () => allPayments.filter((p) => inRange(p.paid_at)),
    [allPayments, inRange],
  );

  const contactName = useMemo(() => {
    const map = new Map(
      allContacts.map((c) => [c.id, `${c.first_name} ${c.last_name}`]),
    );
    return (id: string) => map.get(id) ?? "—";
  }, [allContacts]);

  const reports = useMemo<Record<ReportKey, Report>>(() => {
    const delivered = packages.filter((p) => p.status === "DELIVERED");
    const approved = payments.filter((p) => p.status === "APPROVED");
    const approvedTotal = approved.reduce((sum, p) => sum + p.amount, 0);

    // Ingresos por mes (pagos aprobados).
    const byMonth = new Map<string, { count: number; total: number }>();
    for (const p of approved) {
      const key = p.paid_at.slice(0, 7);
      const entry = byMonth.get(key) ?? { count: 0, total: 0 };
      entry.count += 1;
      entry.total += p.amount;
      byMonth.set(key, entry);
    }
    const months = [...byMonth.entries()].sort((a, b) =>
      a[0] < b[0] ? 1 : -1,
    );

    return {
      clients: {
        key: "clients",
        label: "Clientes",
        icon: Users,
        columns: [
          { label: "Nombre" },
          { label: "Cédula/RIF", kind: "mono" },
          { label: "Teléfono", kind: "mono" },
          { label: "Dirección" },
          { label: "Cliente desde" },
        ],
        rows: contacts.map((c) => [
          `${c.first_name} ${c.last_name}`,
          c.document_id || "—",
          c.phone || "—",
          c.address,
          formatDate(c.created_at),
        ]),
        summary: `${contacts.length} clientes registrados.`,
      },
      packages: {
        key: "packages",
        label: "Paquetes",
        icon: Package,
        columns: [
          { label: "Tracking", kind: "mono" },
          { label: "Descripción" },
          { label: "Peso (kg)", kind: "count" },
          { label: "Estado", kind: "package-status" },
          { label: "Fecha" },
        ],
        rows: packages.map((p) => [
          p.tracking_code,
          p.description,
          String(p.weight_kg),
          packageStatusLabel(p.status),
          formatDate(p.created_at),
        ]),
        summary: `${packages.length} paquetes · ${delivered.length} entregados.`,
      },
      transactions: {
        key: "transactions",
        label: "Transacciones",
        icon: Receipt,
        columns: [
          { label: "Referencia", kind: "mono" },
          { label: "Cliente" },
          { label: "Banco" },
          { label: "Monto", kind: "amount" },
          { label: "Estado", kind: "payment-status" },
          { label: "Fecha" },
        ],
        rows: payments.map((p) => [
          p.reference,
          p.contact ? `${p.contact.first_name} ${p.contact.last_name}` : "—",
          p.bank,
          formatAmount(p.amount),
          PAYMENT_LABEL[p.status],
          formatDate(p.paid_at),
        ]),
        summary: `${payments.length} transacciones · ${approved.length} aprobadas (${formatAmount(approvedTotal)}).`,
      },
      deliveries: {
        key: "deliveries",
        label: "Entregas",
        icon: Truck,
        columns: [
          { label: "Tracking", kind: "mono" },
          { label: "Cliente" },
          { label: "Descripción" },
          { label: "Fecha" },
        ],
        rows: delivered.map((p) => [
          p.tracking_code,
          contactName(p.contact_id),
          p.description,
          formatDate(p.created_at),
        ]),
        summary: `${delivered.length} paquetes entregados.`,
      },
      revenue: {
        key: "revenue",
        label: "Ingresos",
        icon: TrendingUp,
        columns: [
          { label: "Mes" },
          { label: "Pagos aprobados", kind: "count" },
          { label: "Ingresos", kind: "amount" },
        ],
        rows: months.map(([month, v]) => [
          month,
          String(v.count),
          formatAmount(v.total),
        ]),
        summary: `Ingresos validados: ${formatAmount(approvedTotal)} en ${approved.length} pagos.`,
      },
    };
  }, [contacts, packages, payments, contactName]);

  const report = reports[active];

  // Métricas resumen (KPIs) mostradas arriba, siempre visibles.
  const kpis = useMemo(() => {
    const delivered = packages.filter((p) => p.status === "DELIVERED").length;
    const approved = payments.filter((p) => p.status === "APPROVED");
    const approvedTotal = approved.reduce((sum, p) => sum + p.amount, 0);
    return [
      {
        icon: Users,
        label: "Clientes",
        value: String(contacts.length),
        detail: "Contactos registrados",
        accent: false,
      },
      {
        icon: Truck,
        label: "Paquetes entregados",
        value: `${delivered} / ${packages.length}`,
        detail: "Entregados sobre el total",
        accent: false,
      },
      {
        icon: BadgeDollarSign,
        label: "Pagos aprobados",
        value: `${approved.length} / ${payments.length}`,
        detail: "Validados contra el banco",
        accent: false,
      },
      {
        icon: TrendingUp,
        label: "Ingresos validados",
        value: formatAmount(approvedTotal),
        detail: "Suma de pagos aprobados",
        accent: true,
      },
    ];
  }, [contacts, packages, payments]);

  const tabs = (Object.keys(reports) as ReportKey[]).map((key) => reports[key]);
  const ActiveIcon = report.icon;

  return (
    <>
      <PageHeader
        title="Reportes"
        description="Información operativa para la gerencia. Exporta a CSV, Excel o PDF."
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportCsv(report)}>
            <Download data-icon="inline-start" aria-hidden="true" />
            CSV
          </Button>
          <Button variant="outline" onClick={() => exportExcel(report)}>
            <FileSpreadsheet data-icon="inline-start" aria-hidden="true" />
            Excel
          </Button>
          <Button variant="outline" onClick={() => printReport(report)}>
            <Printer data-icon="inline-start" aria-hidden="true" />
            PDF
          </Button>
        </div>
      </PageHeader>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filtro por rango de fechas */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <CalendarDays
          className="size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Label htmlFor="rep-from" className="text-xs text-muted-foreground">
          Desde
        </Label>
        <Input
          id="rep-from"
          type="date"
          value={from}
          max={to || undefined}
          onChange={(event) => setFrom(event.target.value)}
          className="h-9 w-40"
        />
        <Label htmlFor="rep-to" className="text-xs text-muted-foreground">
          Hasta
        </Label>
        <Input
          id="rep-to"
          type="date"
          value={to}
          min={from || undefined}
          onChange={(event) => setTo(event.target.value)}
          className="h-9 w-40"
        />
        {(from || to) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            <X data-icon="inline-start" aria-hidden="true" />
            Limpiar
          </Button>
        )}
      </div>

      {/* KPIs de un vistazo */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))
          : kpis.map((kpi) => (
              <ReportStat key={kpi.label} {...kpi} />
            ))}
      </div>

      {/* Selector de reporte, con icono por tipo */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActive(tab.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <Card className="overflow-hidden py-0">
        <CardContent className="px-0">
          {/* Banda de cabecera del reporte activo */}
          <div className="flex flex-wrap items-center gap-3 border-b px-5 py-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ActiveIcon className="size-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{report.label}</p>
              <p className="text-xs text-muted-foreground">{report.summary}</p>
            </div>
            {!isLoading && (
              <span className="ms-auto rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground tabular-nums">
                {report.rows.length}{" "}
                {report.rows.length === 1 ? "fila" : "filas"}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="grid gap-3 p-6">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-11/12" />
              <Skeleton className="h-5 w-4/5" />
            </div>
          ) : report.rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <ActiveIcon
                className="size-8 text-muted-foreground/50"
                aria-hidden="true"
              />
              <p className="text-sm text-muted-foreground">
                Sin datos para este reporte.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {report.columns.map((column, index) => (
                      <TableHead
                        key={column.label}
                        className={cn(
                          "bg-muted/40 text-xs font-medium tracking-wide text-muted-foreground uppercase",
                          index === 0 && "pl-5",
                          isNumericColumn(column.kind) && "text-right",
                          index === report.columns.length - 1 && "pr-5",
                        )}
                      >
                        {column.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.rows.map((row, rowIndex) => (
                    <TableRow
                      key={rowIndex}
                      className="odd:bg-muted/15 hover:bg-muted/40"
                    >
                      {row.map((cell, cellIndex) => {
                        const column = report.columns[cellIndex];
                        const kind = column?.kind;
                        return (
                          <TableCell
                            key={cellIndex}
                            className={cn(
                              "whitespace-nowrap",
                              cellIndex === 0 && "pl-5",
                              cellIndex === row.length - 1 && "pr-5",
                              isNumericColumn(kind) && "text-right tabular-nums",
                              cellIndex === 0
                                ? "font-medium text-foreground"
                                : cellClass(kind),
                            )}
                          >
                            {renderReportCell(kind, cell)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

type ReportStatProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  accent: boolean;
};

// Tile de métrica del encabezado de Reportes; el acento (rojo Domesa) se
// reserva para la métrica principal de ingresos (regla de un solo acento).
function ReportStat({ icon: Icon, label, value, detail, accent }: ReportStatProps) {
  return (
    <Card className="h-full justify-center gap-3 py-5">
      <CardContent className="grid gap-1 px-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-md",
              accent
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
        </div>
        <span
          className={cn(
            "text-3xl font-medium tracking-tight tabular-nums",
            accent && "text-primary",
          )}
        >
          {value}
        </span>
        <span className="text-xs text-muted-foreground">{detail}</span>
      </CardContent>
    </Card>
  );
}
