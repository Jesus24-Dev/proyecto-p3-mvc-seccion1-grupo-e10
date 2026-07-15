import { createElement, useMemo, useState } from "react";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";

/** Accede a un valor comparable de un elemento para una columna dada. */
export type SortConfig<T> = Record<string, (item: T) => string | number>;

export interface SortController {
  sortKey: string | null;
  direction: SortDirection;
  toggle: (key: string) => void;
}

export interface UseSortableResult<T> extends SortController {
  sorted: T[];
}

/**
 * Ordena una lista al pulsar los encabezados. Sin orden hasta el primer
 * clic; el mismo encabezado alterna ascendente/descendente. El orden es
 * estable: los empates conservan la posición original.
 */
export function useSortable<T>(
  items: T[],
  config: SortConfig<T>,
): UseSortableResult<T> {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [direction, setDirection] = useState<SortDirection>("asc");

  function toggle(key: string) {
    if (key === sortKey) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setDirection("asc");
  }

  const sorted = useMemo(() => {
    const accessor = sortKey ? config[sortKey] : undefined;
    if (!accessor) {
      return items;
    }

    const indexed = items.map((item, index) => ({ item, index }));
    indexed.sort((a, b) => {
      const aValue = accessor(a.item);
      const bValue = accessor(b.item);

      let comparison: number;
      if (typeof aValue === "number" && typeof bValue === "number") {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue), "es", {
          sensitivity: "base",
        });
      }

      if (comparison === 0) {
        return a.index - b.index;
      }
      return direction === "asc" ? comparison : -comparison;
    });

    return indexed.map((entry) => entry.item);
  }, [items, sortKey, direction, config]);

  return { sorted, sortKey, direction, toggle };
}

/** Valor de `aria-sort` para el <th> de una columna ordenable. */
export function ariaSort(
  columnKey: string,
  sortKey: string | null,
  direction: SortDirection,
): "none" | "ascending" | "descending" {
  if (columnKey !== sortKey) {
    return "none";
  }
  return direction === "asc" ? "ascending" : "descending";
}

interface SortButtonProps {
  label: string;
  columnKey: string;
  sortKey: string | null;
  direction: SortDirection;
  onToggle: (key: string) => void;
  className?: string;
}

/**
 * Encabezado interactivo: un <button> con la etiqueta y un chevron que
 * refleja el estado de orden. Debe colocarse dentro de un <TableHead>.
 */
export function SortButton({
  label,
  columnKey,
  sortKey,
  direction,
  onToggle,
  className,
}: SortButtonProps) {
  const isActive = columnKey === sortKey;
  const Icon = !isActive
    ? ChevronsUpDown
    : direction === "asc"
      ? ChevronUp
      : ChevronDown;

  return createElement(
    "button",
    {
      type: "button",
      onClick: () => onToggle(columnKey),
      "aria-label": `Ordenar por ${label}`,
      className: cn(
        "inline-flex items-center gap-1 rounded-sm font-medium outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      ),
    },
    label,
    createElement(Icon, {
      className: cn("size-3.5", isActive ? "text-foreground" : "text-muted-foreground"),
      "aria-hidden": true,
    }),
  );
}
