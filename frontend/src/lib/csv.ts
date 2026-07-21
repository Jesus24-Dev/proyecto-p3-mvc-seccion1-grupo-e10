// Exportación a CSV en el cliente: arma el texto, lo escapa y dispara la
// descarga sin dependencias externas.

function escapeCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  // Comillas, comas y saltos de línea obligan a envolver en comillas dobles.
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Descarga `rows` como CSV. `columns` define encabezados y cómo extraer cada
 * celda de una fila.
 */
export function downloadCsv<T>(
  filename: string,
  columns: { header: string; value: (row: T) => unknown }[],
  rows: T[],
): void {
  const headerLine = columns.map((c) => escapeCell(c.header)).join(",");
  const dataLines = rows.map((row) =>
    columns.map((c) => escapeCell(c.value(row))).join(","),
  );
  // BOM para que Excel respete los acentos (UTF-8).
  const csv = "﻿" + [headerLine, ...dataLines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
