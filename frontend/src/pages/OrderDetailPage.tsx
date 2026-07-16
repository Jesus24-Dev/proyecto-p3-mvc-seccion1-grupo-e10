import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Boxes, Check } from "lucide-react";
import { agenciesApi, ordersApi, packagesApi, usersApi } from "@/api";
import { OrderStatusPill, PackageStatusPill } from "@/components/shared/pills";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageData } from "@/hooks/usePageData";
import { formatAmount, formatDate, orderStatusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TransferStatus } from "@/types";

// Recorrido "feliz" de un envío; los estados negativos son desenlaces aparte.
const HAPPY_FLOW: TransferStatus[] = [
  "CREATED",
  "PENDING_PAYMENT",
  "IN_REVIEW",
  "PROCESSING",
  "READY_FOR_PICKUP",
  "COMPLETED",
];

const NEGATIVE: Record<string, string> = {
  CANCELLED: "El envío fue cancelado.",
  FAILED: "El envío falló.",
  REFUNDED: "El envío fue reembolsado.",
};

function OrderStepper({ status }: { status: TransferStatus }) {
  if (status in NEGATIVE) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
        {NEGATIVE[status]}
      </div>
    );
  }
  const currentIndex = HAPPY_FLOW.indexOf(status);
  return (
    <ol className="flex items-center">
      {HAPPY_FLOW.map((step, index) => {
        const reached = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === HAPPY_FLOW.length - 1;
        return (
          <li key={step} className={cn("flex items-center", !isLast && "flex-1")}>
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                  reached
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground",
                  isCurrent && "ring-3 ring-primary/25",
                )}
              >
                {reached && !isCurrent ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cn(
                  "max-w-20 text-center text-xs leading-tight",
                  isCurrent
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {orderStatusLabel(step)}
              </span>
            </div>
            {!isLast && (
              <span
                className={cn(
                  "mx-1 mb-5 h-0.5 flex-1 rounded-full",
                  index < currentIndex ? "bg-primary" : "bg-border",
                )}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function OrderDetailPage() {
  const { orderId } = useParams();
  const { data, isLoading, error } = usePageData(() =>
    Promise.all([
      ordersApi.list(),
      packagesApi.list(),
      agenciesApi.list(),
      usersApi.list(),
    ]),
  );
  const [orders, packages, agencies, users] = data ?? [[], [], [], []];

  const order = useMemo(
    () => orders.find((item) => item.id === orderId) ?? null,
    [orders, orderId],
  );
  const agencyById = useMemo(
    () => new Map(agencies.map((agency) => [agency.id, agency])),
    [agencies],
  );
  const orderPackages = useMemo(
    () => packages.filter((item) => item.order_id === orderId),
    [packages, orderId],
  );
  const client = order
    ? users.find((user) => user.id === order.user_id)
    : null;

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <div className="grid gap-2">
          <Skeleton className="h-7 w-64 rounded-lg" />
          <Skeleton className="h-4 w-80 rounded" />
        </div>
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link to="/admin/orders" />}
        >
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          Volver a envíos
        </Button>
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>
            {error ?? "El envío solicitado no existe."}
          </AlertDescription>
        </Alert>
      </>
    );
  }

  const origin = agencyById.get(order.origin_agency_id);
  const destination = agencyById.get(order.destination_agency_id);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        className="mb-4"
        render={<Link to="/admin/orders" />}
      >
        <ArrowLeft data-icon="inline-start" aria-hidden="true" />
        Volver a envíos
      </Button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-medium tracking-tight">
              {order.description}
            </h2>
            <OrderStatusPill status={order.status} />
          </div>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {origin?.name ?? "—"}
            <ArrowRight className="size-3.5" aria-hidden="true" />
            {destination?.name ?? "—"}
            <span className="mx-1">·</span>
            {formatAmount(order.amount)}
            <span className="mx-1">·</span>
            {client?.email ?? "Sin cliente"}
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Estado del envío</CardTitle>
          <CardDescription>
            Recibido {formatDate(order.date_received)} · llega{" "}
            {formatDate(order.date_arrived)}.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[36rem]">
            <OrderStepper status={order.status} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paquetes del envío</CardTitle>
          <CardDescription>
            {orderPackages.length} paquete
            {orderPackages.length === 1 ? "" : "s"} en esta orden.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          {orderPackages.length === 0 ? (
            <p className="flex items-center gap-2 px-6 py-6 text-sm text-muted-foreground">
              <Boxes className="size-4" aria-hidden="true" />
              Este envío aún no tiene paquetes asignados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Rastreo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Peso</TableHead>
                  <TableHead className="pr-6">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderPackages.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="pl-6">
                      <Link
                        to={`/admin/packages/${encodeURIComponent(item.tracking_code)}`}
                        className="font-mono text-xs font-medium underline-offset-2 hover:text-primary hover:underline"
                      >
                        {item.tracking_code}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-64 truncate">
                      {item.description}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.weight_kg} kg
                    </TableCell>
                    <TableCell className="pr-6">
                      <PackageStatusPill status={item.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
