import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { contactsApi, packagesApi, paymentsApi } from "@/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatAmount, formatDate, packageStatusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PaymentStatus } from "@/types";

type ReportKey =
  | "clients"
  | "packages"
  | "transactions"
  | "deliveries"
  | "revenue";

interface Report {
  key: ReportKey;
  label: string;
  headers: string[];
  rows: string[][];
  summary: string;
}

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
};

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
  const lines = [report.headers, ...report.rows].map((row) =>
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
  const head = report.headers.map((h) => `<th>${h}</th>`).join("");
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
  const head = report.headers.map((h) => `<th>${h}</th>`).join("");
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
  const contacts = data?.[0] ?? [];
  const packages = data?.[1] ?? [];
  const payments = data?.[2] ?? [];

  const [active, setActive] = useState<ReportKey>("clients");

  const contactName = useMemo(() => {
    const map = new Map(
      contacts.map((c) => [c.id, `${c.first_name} ${c.last_name}`]),
    );
    return (id: string) => map.get(id) ?? "—";
  }, [contacts]);

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
        headers: ["Nombre", "Cédula/RIF", "Teléfono", "Dirección", "Cliente desde"],
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
        headers: ["Tracking", "Descripción", "Peso (kg)", "Estado", "Fecha"],
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
        headers: ["Referencia", "Cliente", "Banco", "Monto", "Estado", "Fecha"],
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
        headers: ["Tracking", "Cliente", "Descripción", "Fecha"],
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
        headers: ["Mes", "Pagos aprobados", "Ingresos"],
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
  const tabs: { key: ReportKey; label: string }[] = [
    { key: "clients", label: "Clientes" },
    { key: "packages", label: "Paquetes" },
    { key: "transactions", label: "Transacciones" },
    { key: "deliveries", label: "Entregas" },
    { key: "revenue", label: "Ingresos" },
  ];

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

      <div className="mb-4 inline-flex flex-wrap rounded-lg border bg-muted/40 p-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            aria-pressed={active === tab.key}
            onClick={() => setActive(tab.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active === tab.key
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card className="py-0">
        <CardContent className="px-0">
          {isLoading ? (
            <div className="grid gap-3 p-6">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-11/12" />
              <Skeleton className="h-5 w-4/5" />
            </div>
          ) : (
            <>
              <p className="border-b px-6 py-3 text-sm text-muted-foreground">
                {report.summary}
              </p>
              {report.rows.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                  Sin datos para este reporte.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {report.headers.map((header, index) => (
                        <TableHead
                          key={header}
                          className={index === 0 ? "pl-6" : undefined}
                        >
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.rows.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <TableCell
                            key={cellIndex}
                            className={cn(
                              cellIndex === 0 && "pl-6 font-medium",
                              cellIndex !== 0 && "text-muted-foreground",
                            )}
                          >
                            {cell}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
