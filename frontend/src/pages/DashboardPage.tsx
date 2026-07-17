import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Boxes,
  Building2,
  CalendarRange,
  Check,
  DollarSign,
  LayoutGrid,
  Package,
  Pencil,
  Plus,
  Users,
} from "lucide-react";
import { agenciesApi, ordersApi, packagesApi, paymentsApi, usersApi } from "@/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { OrderStatusPill } from "@/components/shared/pills";
import {
  DashboardGrid,
  type WidgetDescriptor,
} from "@/components/dashboard/DashboardGrid";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useActiveAgency } from "@/context/AgencyContext";
import { usePageData, useMutationHandler } from "@/hooks/usePageData";
import {
  ORDER_STATUSES,
  formatAmount,
  formatDate,
  orderStatusLabel,
  packageStatusLabel,
} from "@/lib/format";
import type { DashboardWidgetLayout } from "@/types";
import type { LucideIcon } from "lucide-react";

// Distribución por defecto de los widgets del panel (grid de 12 columnas).
const WIDGET_DEFAULTS: DashboardWidgetLayout[] = [
  { id: "kpis", colSpan: 12, rowSpan: 1, order: 0, hidden: false },
  { id: "revenue", colSpan: 6, rowSpan: 2, order: 1, hidden: false },
  { id: "packages-donut", colSpan: 6, rowSpan: 2, order: 2, hidden: false },
  { id: "activity", colSpan: 6, rowSpan: 2, order: 3, hidden: false },
  { id: "orders-status", colSpan: 6, rowSpan: 2, order: 4, hidden: false },
  { id: "recent-orders", colSpan: 12, rowSpan: 2, order: 5, hidden: false },
];

const DASHBOARD_STORAGE_KEY = "dr-logistics-dashboard-layout";

/** Une la distribución guardada con los valores por defecto del registro. */
function mergeLayout(
  saved: DashboardWidgetLayout[] | null | undefined,
): DashboardWidgetLayout[] {
  const savedById = new Map((saved ?? []).map((entry) => [entry.id, entry]));
  let nextOrder = (saved ?? []).reduce(
    (max, entry) => Math.max(max, entry.order),
    WIDGET_DEFAULTS.length - 1,
  );
  return WIDGET_DEFAULTS.map((def) => {
    const existing = savedById.get(def.id);
    return existing ? { ...def, ...existing } : { ...def, order: ++nextOrder };
  });
}

/** Lee la distribución local (usada cuando no hay agencia activa). */
function readLocalLayout(): DashboardWidgetLayout[] | null {
  try {
    const raw = window.localStorage.getItem(DASHBOARD_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DashboardWidgetLayout[]) : null;
  } catch {
    return null;
  }
}

type StatTileProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
};

function StatTile({ icon: Icon, label, value, detail }: StatTileProps) {
  return (
    <Card className="gap-3 py-5">
      <CardContent className="grid gap-1 px-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <span className="text-3xl font-medium tracking-tight tabular-nums">
          {value}
        </span>
        <span className="text-xs text-muted-foreground">{detail}</span>
      </CardContent>
    </Card>
  );
}

// El mismo azul marino ya usado en "Envíos por estado"; el rojo Domesa queda
// reservado a la acción primaria (The One Stamp Rule).
const CHART_NAVY = "oklch(0.45 0.06 260)";
const CHART_NAVY_SOFT = "oklch(0.65 0.05 260)";

// Geometría del lienzo SVG (unidades del viewBox ≈ px al ancho natural).
const CHART_WIDTH = 480;
const CHART_HEIGHT = 200;
const CHART_TOP = 26;
const CHART_BASELINE = 166;
const CHART_LABEL_Y = 188;
const BAR_GAP = 2;

/** Barra con solo las esquinas superiores redondeadas (4px), anclada a la base. */
function roundedTopBarPath(
  x: number,
  y: number,
  width: number,
  height: number,
): string {
  const radius = Math.min(4, height, width / 2);
  return [
    `M ${x} ${y + height}`,
    `V ${y + radius}`,
    `Q ${x} ${y} ${x + radius} ${y}`,
    `H ${x + width - radius}`,
    `Q ${x + width} ${y} ${x + width} ${y + radius}`,
    `V ${y + height}`,
    "Z",
  ].join(" ");
}

type ChartSeries = {
  name: string;
  color: string;
  values: number[];
};

type MonthlyBarChartProps = {
  labels: string[];
  series: ChartSeries[];
  ariaLabel: string;
  /** Etiqueta directa sobre cada barra. */
  formatValue: (value: number) => string;
  /** Valor completo para el <title> accesible; por defecto usa formatValue. */
  formatTitleValue?: (value: number) => string;
};

function MonthlyBarChart({
  labels,
  series,
  ariaLabel,
  formatValue,
  formatTitleValue,
}: MonthlyBarChartProps) {
  const slotWidth = CHART_WIDTH / Math.max(1, labels.length);
  const barWidth = series.length > 1 ? 20 : 24;
  const groupWidth = series.length * barWidth + (series.length - 1) * BAR_GAP;
  const plotHeight = CHART_BASELINE - CHART_TOP;
  const maxValue = Math.max(
    0,
    ...series.flatMap((entry) => entry.values),
  );
  const formatTitle = formatTitleValue ?? formatValue;

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      role="img"
      aria-label={ariaLabel}
      className="h-auto w-full"
    >
      {labels.map((label, monthIndex) => {
        const slotCenter = slotWidth * monthIndex + slotWidth / 2;
        const groupStart = slotCenter - groupWidth / 2;

        return (
          <g key={`${label}-${monthIndex}`}>
            {series.map((entry, seriesIndex) => {
              const value = entry.values[monthIndex] ?? 0;
              const height =
                maxValue > 0 ? (value / maxValue) * plotHeight : 0;
              const x = groupStart + seriesIndex * (barWidth + BAR_GAP);
              const y = CHART_BASELINE - height;

              return (
                <g key={entry.name}>
                  <title>{`${entry.name} — ${label}: ${formatTitle(value)}`}</title>
                  {height > 0 && (
                    <path
                      d={roundedTopBarPath(x, y, barWidth, height)}
                      fill={entry.color}
                    />
                  )}
                  <text
                    x={x + barWidth / 2}
                    y={y - 6}
                    textAnchor="middle"
                    className="fill-muted-foreground text-xs tabular-nums"
                  >
                    {formatValue(value)}
                  </text>
                </g>
              );
            })}
            <text
              x={slotCenter}
              y={CHART_LABEL_Y}
              textAnchor="middle"
              className="fill-muted-foreground text-xs"
            >
              {label}
            </text>
          </g>
        );
      })}
      <line
        x1={6}
        x2={CHART_WIDTH - 6}
        y1={CHART_BASELINE}
        y2={CHART_BASELINE}
        className="stroke-border"
        strokeWidth={1}
      />
    </svg>
  );
}

function ChartEmptyMessage({ children }: { children: string }) {
  return (
    <p className="py-12 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

type DonutSlice = { label: string; value: number; color: string };

/** Dona SVG para repartos parte-de-todo (paquetes por estado). */
function DonutChart({ slices }: { slices: DonutSlice[] }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const size = 168;
  const stroke = 26;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Paquetes por estado, ${total} en total`}
      >
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {slices.map((slice) => {
            const length = (slice.value / total) * circumference;
            const segment = (
              <circle
                key={slice.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={stroke}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
              >
                <title>
                  {slice.label}: {slice.value}
                </title>
              </circle>
            );
            offset += length;
            return segment;
          })}
        </g>
        <text
          x="50%"
          y="47%"
          textAnchor="middle"
          className="fill-foreground text-2xl font-medium tabular-nums"
        >
          {total}
        </text>
        <text
          x="50%"
          y="60%"
          textAnchor="middle"
          className="fill-muted-foreground text-xs"
        >
          paquetes
        </text>
      </svg>
      <ul className="grid gap-1.5">
        {slices.map((slice) => (
          <li
            key={slice.label}
            className="flex items-center gap-2 text-sm"
          >
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="flex-1">{slice.label}</span>
            <span className="font-medium tabular-nums">{slice.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Línea de tendencia SVG (ingresos mes a mes) con área bajo la curva. */
function TrendLineChart({
  labels,
  values,
  formatTitleValue,
}: {
  labels: string[];
  values: number[];
  formatTitleValue: (value: number) => string;
}) {
  const width = 460;
  const height = 200;
  const padX = 32;
  const padY = 24;
  const max = Math.max(...values, 1);
  const stepX =
    values.length > 1 ? (width - padX * 2) / (values.length - 1) : 0;

  const points = values.map((value, index) => ({
    x: padX + index * stepX,
    y: height - padY - (value / max) * (height - padY * 2),
  }));
  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const area = `${line} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${height - padY} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label="Tendencia de ingresos por mes"
    >
      <line
        x1={padX}
        y1={height - padY}
        x2={width - padX}
        y2={height - padY}
        className="stroke-border"
        strokeWidth={1}
      />
      <path d={area} fill={CHART_NAVY} opacity={0.12} />
      <path
        d={line}
        fill="none"
        stroke={CHART_NAVY}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r={4} fill={CHART_NAVY}>
          <title>
            {labels[index]}: {formatTitleValue(values[index])}
          </title>
        </circle>
      ))}
      {points.map((point, index) => (
        <text
          key={`l-${index}`}
          x={point.x}
          y={height - padY + 16}
          textAnchor="middle"
          className="fill-muted-foreground text-xs"
        >
          {labels[index]}
        </text>
      ))}
    </svg>
  );
}

// Los meses se derivan en UTC porque las fechas se guardan como medianoche UTC
// (ver src/lib/format.ts): la zona local correría los cortes de mes.
const monthLabelFormatter = new Intl.DateTimeFormat("es-VE", {
  month: "short",
  timeZone: "UTC",
});

const integerFormatter = new Intl.NumberFormat("es-VE", {
  maximumFractionDigits: 0,
});

/** Clave año-mes en UTC, o null si la fecha no es válida. */
function monthKeyOf(isoDate: string): string | null {
  const parsed = new Date(isoDate);
  return Number.isNaN(parsed.getTime())
    ? null
    : `${parsed.getUTCFullYear()}-${parsed.getUTCMonth()}`;
}

type RangePreset = "30d" | "90d" | "6m" | "12m" | "custom";

const RANGE_OPTIONS: Array<{ value: RangePreset; label: string }> = [
  { value: "30d", label: "Últimos 30 días" },
  { value: "90d", label: "Últimos 90 días" },
  { value: "6m", label: "Últimos 6 meses" },
  { value: "12m", label: "Últimos 12 meses" },
  { value: "custom", label: "Rango personalizado" },
];

/** Resuelve el preset (o rango custom) a milisegundos [from, to]. */
function resolveRange(
  preset: RangePreset,
  customFrom: string,
  customTo: string,
): { from: number; to: number } {
  const now = Date.now();
  if (preset === "custom") {
    const from = customFrom ? new Date(customFrom).getTime() : 0;
    const toBase = customTo ? new Date(customTo).getTime() : now;
    // Incluye todo el día final.
    const to = customTo ? toBase + 24 * 60 * 60 * 1000 - 1 : now;
    return { from: Number.isNaN(from) ? 0 : from, to: Number.isNaN(to) ? now : to };
  }
  const days = preset === "30d" ? 30 : preset === "90d" ? 90 : 0;
  if (days) {
    return { from: now - days * 24 * 60 * 60 * 1000, to: now };
  }
  const months = preset === "12m" ? 12 : 6;
  const d = new Date();
  const from = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - (months - 1), 1);
  return { from, to: now };
}

export function DashboardPage() {
  const { activeAgencyId } = useActiveAgency();
  const { data, isLoading, error } = usePageData(() =>
    Promise.all([
      usersApi.list(),
      agenciesApi.list(),
      ordersApi.list(),
      packagesApi.list(),
      paymentsApi.list(),
    ]),
  );
  const [users, agencies, orders, packages, payments] = data ?? [
    [],
    [],
    [],
    [],
    [],
  ];

  const agencyById = useMemo(
    () => new Map(agencies.map((agency) => [agency.id, agency])),
    [agencies],
  );

  const activeAgency =
    (activeAgencyId ? agencyById.get(activeAgencyId) : undefined) ?? null;

  const runMutation = useMutationHandler();
  const [editing, setEditing] = useState(false);
  const [layout, setLayout] = useState<DashboardWidgetLayout[]>(() =>
    mergeLayout(null),
  );
  const [layoutKey, setLayoutKey] = useState<string | null>(null);

  // Clave de la fuente de la distribución. Al cambiar (otra agencia activa, o
  // sin agencia), recarga la distribución guardada. Es el patrón de React de
  // "ajustar estado al cambiar una prop" (durante el render, no en un efecto).
  const sourceKey = activeAgencyId
    ? activeAgency
      ? `agency:${activeAgency.id}`
      : null // agencias aún cargando: esperamos
    : "local";

  if (sourceKey && sourceKey !== layoutKey) {
    setLayoutKey(sourceKey);
    const saved = activeAgency
      ? (activeAgency.dashboard_layout ?? null)
      : readLocalLayout();
    setLayout(mergeLayout(saved));
  }

  async function persistLayout(next: DashboardWidgetLayout[]) {
    if (activeAgencyId) {
      await runMutation(async () => {
        await agenciesApi.updateDashboard(activeAgencyId, next);
      });
    } else {
      try {
        window.localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // El almacenamiento local puede no estar disponible.
      }
    }
  }

  function toggleEdit() {
    if (editing) {
      void persistLayout(layout);
    }
    setEditing((current) => !current);
  }

  function showWidget(id: string) {
    setLayout((current) => {
      const maxOrder = current.reduce((max, entry) => Math.max(max, entry.order), -1);
      return current.map((entry) =>
        entry.id === id
          ? { ...entry, hidden: false, order: maxOrder + 1 }
          : entry,
      );
    });
  }

  const hiddenWidgets = layout.filter((entry) => entry.hidden);

  // Rango de fechas seleccionado (por defecto: últimos 6 meses).
  const [rangePreset, setRangePreset] = useState<RangePreset>("6m");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const range = useMemo(
    () => resolveRange(rangePreset, customFrom, customTo),
    [rangePreset, customFrom, customTo],
  );
  const inRange = (iso: string) => {
    const t = new Date(iso).getTime();
    return !Number.isNaN(t) && t >= range.from && t <= range.to;
  };

  // Alcance por agencia (sin rango): órdenes donde participa como origen o
  // destino, y paquetes cuya orden pertenece a ese conjunto. Los paquetes sin
  // orden solo se muestran cuando no hay agencia activa.
  const agencyOrders = useMemo(() => {
    if (!activeAgencyId) {
      return orders;
    }
    return orders.filter(
      (order) =>
        order.origin_agency_id === activeAgencyId ||
        order.destination_agency_id === activeAgencyId,
    );
  }, [orders, activeAgencyId]);

  const agencyPackages = useMemo(() => {
    if (!activeAgencyId) {
      return packages;
    }
    const agencyOrderIds = new Set(agencyOrders.map((order) => order.id));
    return packages.filter(
      (item) => item.order_id !== null && agencyOrderIds.has(item.order_id),
    );
  }, [packages, agencyOrders, activeAgencyId]);

  // Alcance final: agencia + rango de fechas (por fecha de recepción / creación).
  const scopedOrders = useMemo(
    () => agencyOrders.filter((order) => inRange(order.date_received)),
    // inRange depende de range; agencyOrders del alcance por agencia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agencyOrders, range],
  );
  const scopedPackages = useMemo(
    () => agencyPackages.filter((item) => inRange(item.created_at)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agencyPackages, range],
  );

  const stats = useMemo(() => {
    const activeAgencies = agencies.filter((agency) => agency.is_active);
    const completedOrders = scopedOrders.filter(
      (order) => order.status === "COMPLETED",
    );
    const totalAmount = scopedOrders.reduce(
      (sum, order) => sum + order.amount,
      0,
    );
    const deliveredPackages = scopedPackages.filter(
      (item) => item.status === "DELIVERED",
    ).length;
    const admins = users.filter((user) => user.role === "ADMIN").length;
    const distributors = users.filter(
      (user) => user.role === "DISTRIBUTOR",
    ).length;

    return {
      activeAgencies: activeAgencies.length,
      completedOrders: completedOrders.length,
      totalAmount,
      deliveredPackages,
      admins,
      distributors,
    };
  }, [users, agencies, scopedOrders, scopedPackages]);

  const statusBreakdown = useMemo(() => {
    const counts = new Map<string, number>();

    for (const order of scopedOrders) {
      counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
    }

    // Mantiene el orden del ciclo de vida y omite estados sin envíos.
    return ORDER_STATUSES.filter((status) => counts.has(status)).map(
      (status) => ({
        status,
        count: counts.get(status) ?? 0,
      }),
    );
  }, [scopedOrders]);

  // Reparto de paquetes por estado físico, para la dona.
  const packageDonut = useMemo(() => {
    const tones: Record<string, string> = {
      RECEIVED: "oklch(0.7 0.03 260)",
      IN_TRANSIT: "oklch(0.62 0.09 255)",
      IN_WAREHOUSE: "oklch(0.5 0.1 255)",
      OUT_FOR_DELIVERY: "oklch(0.68 0.14 65)",
      DELIVERED: "oklch(0.6 0.13 158)",
      RETURNED: "oklch(0.55 0.16 25)",
    };
    const counts = new Map<string, number>();
    for (const item of scopedPackages) {
      counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
    }
    return [...counts.entries()].map(([status, value]) => ({
      label: packageStatusLabel(status as (typeof scopedPackages)[number]["status"]),
      value,
      color: tones[status] ?? CHART_NAVY,
    }));
  }, [scopedPackages]);

  // Meses que abarca el rango seleccionado (en UTC), máximo 12 barras.
  const monthBuckets = useMemo(() => {
    const start = new Date(range.from);
    const end = new Date(range.to);
    const buckets: Array<{ key: string; label: string }> = [];
    let year = start.getUTCFullYear();
    let month = start.getUTCMonth();
    const endYear = end.getUTCFullYear();
    const endMonth = end.getUTCMonth();
    while (year < endYear || (year === endYear && month <= endMonth)) {
      const date = new Date(Date.UTC(year, month, 1));
      buckets.push({
        key: `${date.getUTCFullYear()}-${date.getUTCMonth()}`,
        label: monthLabelFormatter.format(date),
      });
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }
    // Nunca vacío; como máximo las últimas 12 barras.
    if (buckets.length === 0) {
      const d = new Date(range.to);
      buckets.push({
        key: `${d.getUTCFullYear()}-${d.getUTCMonth()}`,
        label: monthLabelFormatter.format(d),
      });
    }
    return buckets.slice(-12);
  }, [range]);

  const rangeLabel =
    RANGE_OPTIONS.find((option) => option.value === rangePreset)?.label ??
    "rango seleccionado";

  const monthlyRevenue = useMemo(() => {
    const sums = new Map(monthBuckets.map((bucket) => [bucket.key, 0]));

    for (const order of scopedOrders) {
      const key = monthKeyOf(order.date_received);

      if (key !== null && sums.has(key)) {
        sums.set(key, (sums.get(key) ?? 0) + order.amount);
      }
    }

    return monthBuckets.map((bucket) => sums.get(bucket.key) ?? 0);
  }, [monthBuckets, scopedOrders]);

  const monthlyActivity = useMemo(() => {
    const orderCounts = new Map(monthBuckets.map((bucket) => [bucket.key, 0]));
    const packageCounts = new Map(
      monthBuckets.map((bucket) => [bucket.key, 0]),
    );

    for (const order of scopedOrders) {
      const key = monthKeyOf(order.date_received);

      if (key !== null && orderCounts.has(key)) {
        orderCounts.set(key, (orderCounts.get(key) ?? 0) + 1);
      }
    }

    for (const item of scopedPackages) {
      const key = monthKeyOf(item.created_at);

      if (key !== null && packageCounts.has(key)) {
        packageCounts.set(key, (packageCounts.get(key) ?? 0) + 1);
      }
    }

    return {
      orders: monthBuckets.map((bucket) => orderCounts.get(bucket.key) ?? 0),
      packages: monthBuckets.map(
        (bucket) => packageCounts.get(bucket.key) ?? 0,
      ),
    };
  }, [monthBuckets, scopedOrders, scopedPackages]);

  const hasRevenue = monthlyRevenue.some((value) => value > 0);
  const hasActivity =
    monthlyActivity.orders.some((value) => value > 0) ||
    monthlyActivity.packages.some((value) => value > 0);

  const recentOrders = useMemo(
    () =>
      [...scopedOrders]
        .sort(
          (a, b) =>
            new Date(b.date_received).getTime() -
            new Date(a.date_received).getTime(),
        )
        .slice(0, 5),
    [scopedOrders],
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  const pendingPayments = payments.filter((p) => p.status === "PENDING").length;
  const validatedPayments = payments.filter((p) => p.status === "APPROVED");
  const validatedTotal = validatedPayments.reduce(
    (sum, p) => sum + p.amount,
    0,
  );

  const widgets: WidgetDescriptor[] = [
    {
      id: "kpis",
      title: "Indicadores",
      content: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <StatTile
            icon={Users}
            label="Usuarios"
            value={String(users.length)}
            detail={`${stats.admins} admin · ${stats.distributors} ${stats.distributors === 1 ? "distribuidor" : "distribuidores"}`}
          />
          <StatTile
            icon={Building2}
            label="Agencias"
            value={String(agencies.length)}
            detail={`${stats.activeAgencies} ${stats.activeAgencies === 1 ? "activa" : "activas"}`}
          />
          <StatTile
            icon={Package}
            label="Envíos"
            value={String(scopedOrders.length)}
            detail={`${stats.completedOrders} ${stats.completedOrders === 1 ? "completado" : "completados"}`}
          />
          <StatTile
            icon={Boxes}
            label="Paquetes"
            value={String(scopedPackages.length)}
            detail={`${stats.deliveredPackages} ${stats.deliveredPackages === 1 ? "entregado" : "entregados"}`}
          />
          <StatTile
            icon={DollarSign}
            label="Monto en envíos"
            value={formatAmount(stats.totalAmount)}
            detail={
              activeAgency
                ? "Suma de las órdenes de la agencia activa"
                : "Suma de todas las órdenes registradas"
            }
          />
          <StatTile
            icon={Banknote}
            label="Pagos pendientes"
            value={String(pendingPayments)}
            detail="Por validar con el banco"
          />
          <StatTile
            icon={BadgeCheck}
            label="Pagos validados"
            value={formatAmount(validatedTotal)}
            detail={`${validatedPayments.length} ${validatedPayments.length === 1 ? "pago aprobado" : "pagos aprobados"}`}
          />
        </div>
      ),
    },
    {
      id: "revenue",
      title: "Ingresos por mes",
      content: (
        <Card>
          <CardHeader>
            <CardTitle>Ingresos por mes</CardTitle>
            <CardDescription>
              Montos (USD) de órdenes por mes de recepción · {rangeLabel.toLowerCase()}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasRevenue ? (
              <TrendLineChart
                labels={monthBuckets.map((bucket) => bucket.label)}
                values={monthlyRevenue}
                formatTitleValue={formatAmount}
              />
            ) : (
              <ChartEmptyMessage>
                Sin ingresos registrados en los últimos 6 meses.
              </ChartEmptyMessage>
            )}
          </CardContent>
        </Card>
      ),
    },
    {
      id: "packages-donut",
      title: "Paquetes por estado",
      content: (
        <Card>
          <CardHeader>
            <CardTitle>Paquetes por estado</CardTitle>
            <CardDescription>
              Reparto del ciclo físico de los paquetes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {packageDonut.length > 0 ? (
              <DonutChart slices={packageDonut} />
            ) : (
              <ChartEmptyMessage>
                Aún no hay paquetes registrados.
              </ChartEmptyMessage>
            )}
          </CardContent>
        </Card>
      ),
    },
    {
      id: "activity",
      title: "Actividad mensual",
      content: (
        <Card>
          <CardHeader>
            <CardTitle>Actividad mensual</CardTitle>
            <CardDescription>
              Envíos y paquetes registrados por mes · {rangeLabel.toLowerCase()}.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4">
            {hasActivity ? (
              <>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      aria-hidden="true"
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: CHART_NAVY }}
                    />
                    Envíos
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      aria-hidden="true"
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: CHART_NAVY_SOFT }}
                    />
                    Paquetes
                  </span>
                </div>
                <MonthlyBarChart
                  labels={monthBuckets.map((bucket) => bucket.label)}
                  series={[
                    {
                      name: "Envíos",
                      color: CHART_NAVY,
                      values: monthlyActivity.orders,
                    },
                    {
                      name: "Paquetes",
                      color: CHART_NAVY_SOFT,
                      values: monthlyActivity.packages,
                    },
                  ]}
                  ariaLabel="Envíos y paquetes registrados por mes en los últimos 6 meses"
                  formatValue={(value) => integerFormatter.format(value)}
                />
              </>
            ) : (
              <ChartEmptyMessage>
                Sin actividad registrada en los últimos 6 meses.
              </ChartEmptyMessage>
            )}
          </CardContent>
        </Card>
      ),
    },
    {
      id: "orders-status",
      title: "Envíos por estado",
      content: (
        <Card>
          <CardHeader>
            <CardTitle>Envíos por estado</CardTitle>
            <CardDescription>
              Distribución actual del ciclo de vida de las órdenes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statusBreakdown.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aún no hay envíos registrados.
              </p>
            ) : (
              <ul className="grid gap-4">
                {statusBreakdown.map((entry) => (
                  <li key={entry.status} className="grid gap-1.5">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span>{orderStatusLabel(entry.status)}</span>
                      <span className="font-medium tabular-nums">
                        {entry.count}
                      </span>
                    </div>
                    <div
                      role="img"
                      aria-label={`${orderStatusLabel(entry.status)}: ${entry.count} de ${scopedOrders.length} envíos`}
                      className="h-2.5 overflow-hidden rounded-full bg-muted"
                    >
                      <div
                        className="h-full rounded-full bg-[oklch(0.45_0.06_260)]"
                        style={{
                          width: `${(entry.count / Math.max(1, scopedOrders.length)) * 100}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ),
    },
    {
      id: "recent-orders",
      title: "Envíos recientes",
      content: (
        <Card className="py-0">
          <CardHeader className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="grid gap-1.5">
                <CardTitle>Envíos recientes</CardTitle>
                <CardDescription>
                  Las últimas órdenes recibidas en la red.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<Link to="/admin/orders" />}
              >
                Ver todos
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {recentOrders.length === 0 ? (
              <p className="px-6 py-6 text-center text-sm text-muted-foreground">
                Aún no hay envíos registrados.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Envío</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="pr-6">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="max-w-52 pl-6">
                        <div className="grid gap-0.5">
                          <span className="truncate font-medium">
                            {order.description}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(order.date_received)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {agencyById.get(order.destination_agency_id)?.name ??
                          "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatAmount(order.amount)}
                      </TableCell>
                      <TableCell className="pr-6">
                        <OrderStatusPill status={order.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ),
    },
  ];

  const widgetTitleById = new Map(
    widgets.map((widget) => [widget.id, widget.title]),
  );

  return (
    <>
      <PageHeader
        title="Resumen de operaciones"
        description={
          activeAgency
            ? `El estado de la red de un vistazo: cuentas, cobertura y movimiento de envíos. Mostrando solo la agencia ${activeAgency.name}.`
            : "El estado de la red de un vistazo: cuentas, cobertura y movimiento de envíos."
        }
      >
        {editing && hiddenWidgets.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button type="button" className={buttonVariants({ variant: "outline" })}>
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  Agregar widget
                </button>
              }
            />
            <DropdownMenuContent align="end">
              {hiddenWidgets.map((entry) => (
                <DropdownMenuItem
                  key={entry.id}
                  onClick={() => showWidget(entry.id)}
                >
                  {widgetTitleById.get(entry.id) ?? entry.id}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button
          variant={editing ? "default" : "outline"}
          onClick={toggleEdit}
        >
          {editing ? (
            <>
              <Check data-icon="inline-start" aria-hidden="true" />
              Listo
            </>
          ) : (
            <>
              <Pencil data-icon="inline-start" aria-hidden="true" />
              Editar panel
            </>
          )}
        </Button>
      </PageHeader>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <CalendarRange
          className="size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <span className="text-sm text-muted-foreground">Periodo:</span>
        <Select
          items={RANGE_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          value={rangePreset}
          onValueChange={(value) => setRangePreset(value as RangePreset)}
        >
          <SelectTrigger className="w-52" aria-label="Rango de fechas">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {rangePreset === "custom" &&
          (() => {
            const parse = (value: string) =>
              value ? new Date(`${value}T00:00:00`) : undefined;
            const selectedRange: DateRange | undefined =
              customFrom || customTo
                ? { from: parse(customFrom), to: parse(customTo) }
                : undefined;
            const label =
              selectedRange?.from && selectedRange.to
                ? `${format(selectedRange.from, "d MMM yyyy", { locale: es })} – ${format(selectedRange.to, "d MMM yyyy", { locale: es })}`
                : selectedRange?.from
                  ? `Desde ${format(selectedRange.from, "d MMM yyyy", { locale: es })}`
                  : "Elige un rango";
            return (
              <Popover>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "justify-start font-normal",
                      )}
                    >
                      <CalendarRange
                        data-icon="inline-start"
                        aria-hidden="true"
                      />
                      {label}
                    </button>
                  }
                />
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    numberOfMonths={2}
                    defaultMonth={selectedRange?.from}
                    selected={selectedRange}
                    onSelect={(next) => {
                      setCustomFrom(
                        next?.from ? format(next.from, "yyyy-MM-dd") : "",
                      );
                      setCustomTo(next?.to ? format(next.to, "yyyy-MM-dd") : "");
                    }}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            );
          })()}
      </div>

      {editing && (
        <p className="mb-4 flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
          <LayoutGrid className="size-4 text-primary" aria-hidden="true" />
          Arrastra por el asa para reordenar, usa el borde derecho para el
          ancho, el inferior para el alto (o la esquina para ambos) y la × para
          ocultar un widget.
        </p>
      )}

      <DashboardGrid
        widgets={widgets}
        layout={layout}
        editing={editing}
        onLayoutChange={setLayout}
      />
    </>
  );
}
