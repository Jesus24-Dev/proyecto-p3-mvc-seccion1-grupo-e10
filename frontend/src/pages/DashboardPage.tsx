import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Boxes,
  Building2,
  DollarSign,
  Package,
  Users,
} from "lucide-react";
import { agenciesApi, ordersApi, packagesApi, usersApi } from "@/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { OrderStatusPill } from "@/components/shared/pills";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { usePageData } from "@/hooks/usePageData";
import {
  ORDER_STATUSES,
  formatAmount,
  formatDate,
  orderStatusLabel,
} from "@/lib/format";
import type { LucideIcon } from "lucide-react";

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

// Los meses se derivan en UTC porque las fechas se guardan como medianoche UTC
// (ver src/lib/format.ts): la zona local correría los cortes de mes.
const monthLabelFormatter = new Intl.DateTimeFormat("es-VE", {
  month: "short",
  timeZone: "UTC",
});

const compactNumberFormatter = new Intl.NumberFormat("es-VE", {
  notation: "compact",
  maximumFractionDigits: 1,
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

export function DashboardPage() {
  const { activeAgencyId } = useActiveAgency();
  const { data, isLoading, error } = usePageData(() =>
    Promise.all([
      usersApi.list(),
      agenciesApi.list(),
      ordersApi.list(),
      packagesApi.list(),
    ]),
  );
  const [users, agencies, orders, packages] = data ?? [[], [], [], []];

  const agencyById = useMemo(
    () => new Map(agencies.map((agency) => [agency.id, agency])),
    [agencies],
  );

  const activeAgency =
    (activeAgencyId ? agencyById.get(activeAgencyId) : undefined) ?? null;

  // Alcance por agencia: órdenes donde participa como origen o destino, y
  // paquetes cuya orden pertenece a ese conjunto. Los paquetes sin orden solo
  // se muestran cuando no hay agencia activa.
  const scopedOrders = useMemo(() => {
    if (!activeAgencyId) {
      return orders;
    }

    return orders.filter(
      (order) =>
        order.origin_agency_id === activeAgencyId ||
        order.destination_agency_id === activeAgencyId,
    );
  }, [orders, activeAgencyId]);

  const scopedPackages = useMemo(() => {
    if (!activeAgencyId) {
      return packages;
    }

    const scopedOrderIds = new Set(scopedOrders.map((order) => order.id));

    return packages.filter(
      (item) => item.order_id !== null && scopedOrderIds.has(item.order_id),
    );
  }, [packages, scopedOrders, activeAgencyId]);

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

  // Últimos 6 meses (incluido el actual), en UTC.
  const monthBuckets = useMemo(() => {
    const now = new Date();

    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1),
      );

      return {
        key: `${date.getUTCFullYear()}-${date.getUTCMonth()}`,
        label: monthLabelFormatter.format(date),
      };
    });
  }, []);

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

  return (
    <>
      <PageHeader
        title="Resumen de operaciones"
        description={
          activeAgency
            ? `El estado de la red de un vistazo: cuentas, cobertura y movimiento de envíos. Mostrando solo la agencia ${activeAgency.name}.`
            : "El estado de la red de un vistazo: cuentas, cobertura y movimiento de envíos."
        }
      />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ingresos por mes</CardTitle>
            <CardDescription>
              Montos (USD) de órdenes por mes de recepción, últimos 6 meses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasRevenue ? (
              <MonthlyBarChart
                labels={monthBuckets.map((bucket) => bucket.label)}
                series={[
                  {
                    name: "Ingresos",
                    color: CHART_NAVY,
                    values: monthlyRevenue,
                  },
                ]}
                ariaLabel="Ingresos por mes de los últimos 6 meses, en dólares"
                formatValue={(value) => compactNumberFormatter.format(value)}
                formatTitleValue={formatAmount}
              />
            ) : (
              <ChartEmptyMessage>
                Sin ingresos registrados en los últimos 6 meses.
              </ChartEmptyMessage>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actividad mensual</CardTitle>
            <CardDescription>
              Envíos y paquetes registrados por mes, últimos 6 meses.
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
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
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

        <Card className="py-0 lg:col-span-3">
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
                render={<Link to="/admin/envios" />}
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
      </div>
    </>
  );
}
