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

export function DashboardPage() {
  const { data, isLoading, error } = usePageData(() =>
    Promise.all([
      usersApi.list(),
      agenciesApi.list(),
      ordersApi.list(),
      packagesApi.list(),
    ]),
  );
  const [users, agencies, orders, packages] = data ?? [[], [], [], []];

  const stats = useMemo(() => {
    const activeAgencies = agencies.filter((agency) => agency.is_active);
    const completedOrders = orders.filter(
      (order) => order.status === "COMPLETED",
    );
    const totalAmount = orders.reduce((sum, order) => sum + order.amount, 0);
    const admins = users.filter((user) => user.role === "ADMIN").length;
    const distributors = users.filter(
      (user) => user.role === "DISTRIBUTOR",
    ).length;

    return {
      activeAgencies: activeAgencies.length,
      completedOrders: completedOrders.length,
      totalAmount,
      admins,
      distributors,
    };
  }, [users, agencies, orders]);

  const statusBreakdown = useMemo(() => {
    const counts = new Map<string, number>();

    for (const order of orders) {
      counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
    }

    // Mantiene el orden del ciclo de vida y omite estados sin envíos.
    return ORDER_STATUSES.filter((status) => counts.has(status)).map(
      (status) => ({
        status,
        count: counts.get(status) ?? 0,
      }),
    );
  }, [orders]);



  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort(
          (a, b) =>
            new Date(b.date_received).getTime() -
            new Date(a.date_received).getTime(),
        )
        .slice(0, 5),
    [orders],
  );

  const agencyById = useMemo(
    () => new Map(agencies.map((agency) => [agency.id, agency])),
    [agencies],
  );

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Resumen de operaciones"
        description="El estado de la red de un vistazo: cuentas, cobertura y movimiento de envíos."
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
          value={String(orders.length)}
          detail={`${stats.completedOrders} ${stats.completedOrders === 1 ? "completado" : "completados"}`}
        />
        <StatTile
          icon={Boxes}
          label="Paquetes"
          value={String(packages.length)}
          detail={`${packages.filter((item) => item.status === "DELIVERED").length === 1 ? "1 entregado" : `${packages.filter((item) => item.status === "DELIVERED").length} entregados`}`}
        />
        <StatTile
          icon={DollarSign}
          label="Monto en envíos"
          value={formatAmount(stats.totalAmount)}
          detail="Suma de todas las órdenes registradas"
        />
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
                      aria-label={`${orderStatusLabel(entry.status)}: ${entry.count} de ${orders.length} envíos`}
                      className="h-2.5 overflow-hidden rounded-full bg-muted"
                    >
                      <div
                        className="h-full rounded-full bg-[oklch(0.45_0.06_260)]"
                        style={{
                          width: `${(entry.count / Math.max(1, orders.length)) * 100}%`,
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
