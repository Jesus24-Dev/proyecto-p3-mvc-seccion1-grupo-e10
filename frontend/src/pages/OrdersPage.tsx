import { useMemo, useState, type FormEvent } from "react";
import { ArrowRight, Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { agenciesApi, ordersApi, usersApi } from "@/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { OrderStatusPill } from "@/components/shared/pills";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMutationHandler, usePageData } from "@/hooks/usePageData";
import {
  ORDER_STATUSES,
  formatAmount,
  formatDate,
  orderStatusLabel,
  toDateInputValue,
} from "@/lib/format";
import type { Order, TransferStatus } from "@/types";

type FormState = {
  user_id: string;
  origin_agency_id: string;
  destination_agency_id: string;
  date_received: string;
  date_arrived: string;
  description: string;
  amount: string;
  status: TransferStatus;
};

const emptyForm: FormState = {
  user_id: "",
  origin_agency_id: "",
  destination_agency_id: "",
  date_received: "",
  date_arrived: "",
  description: "",
  amount: "",
  status: "CREATED",
};

export function OrdersPage() {
  const { data, isLoading, error, reload } = usePageData(() =>
    Promise.all([ordersApi.list(), usersApi.list(), agenciesApi.list()]),
  );
  const [orders, users, agencies] = data ?? [[], [], []];
  const runMutation = useMutationHandler();

  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [notice, setNotice] = useState<{
    text: string;
    tone: "success" | "danger";
  } | null>(null);

  const userById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );
  const agencyById = useMemo(
    () => new Map(agencies.map((agency) => [agency.id, agency])),
    [agencies],
  );

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return orders;
    }

    return orders.filter((order) => {
      const client = userById.get(order.user_id);
      const origin = agencyById.get(order.origin_agency_id);
      const destination = agencyById.get(order.destination_agency_id);

      return (
        order.description.toLowerCase().includes(query) ||
        orderStatusLabel(order.status).toLowerCase().includes(query) ||
        client?.email.toLowerCase().includes(query) ||
        origin?.name.toLowerCase().includes(query) ||
        destination?.name.toLowerCase().includes(query)
      );
    });
  }, [orders, search, userById, agencyById]);

  const canCreate = users.length > 0 && agencies.length > 0;

  function openCreate() {
    setEditingOrder(null);
    setForm({
      ...emptyForm,
      user_id: users[0]?.id ?? "",
      origin_agency_id: agencies[0]?.id ?? "",
      destination_agency_id: agencies[1]?.id ?? agencies[0]?.id ?? "",
    });
    setFormError(null);
    setIsFormOpen(true);
  }

  function openEdit(order: Order) {
    setEditingOrder(order);
    setForm({
      user_id: order.user_id,
      origin_agency_id: order.origin_agency_id,
      destination_agency_id: order.destination_agency_id,
      date_received: toDateInputValue(order.date_received),
      date_arrived: toDateInputValue(order.date_arrived),
      description: order.description,
      amount: String(order.amount),
      status: order.status,
    });
    setFormError(null);
    setIsFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFormError(null);

    const payload = {
      user_id: form.user_id,
      origin_agency_id: form.origin_agency_id,
      destination_agency_id: form.destination_agency_id,
      date_received: form.date_received,
      date_arrived: form.date_arrived,
      description: form.description,
      amount: Number(form.amount),
      status: form.status,
    };

    const failure = await runMutation(async () => {
      if (editingOrder) {
        await ordersApi.update(editingOrder.id, payload);
      } else {
        await ordersApi.create(payload);
      }
    });

    setIsSaving(false);

    if (failure) {
      setFormError(failure);
      return;
    }

    setIsFormOpen(false);
    setNotice({
      text: editingOrder
        ? "Envío actualizado correctamente."
        : "Envío registrado correctamente.",
      tone: "success",
    });
    void reload();
  }

  async function handleDelete() {
    if (!orderToDelete) {
      return;
    }

    const failure = await runMutation(() => ordersApi.remove(orderToDelete.id));
    setOrderToDelete(null);
    setNotice(
      failure
        ? { text: failure, tone: "danger" }
        : { text: "Envío eliminado correctamente.", tone: "success" },
    );
    void reload();
  }

  return (
    <>
      <PageHeader
        title="Envíos"
        description="Órdenes de la red: cliente, ruta entre agencias, montos y estado de cada encomienda."
      >
        <Button onClick={openCreate} disabled={!canCreate}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          Registrar envío
        </Button>
      </PageHeader>

      {notice && (
        <Alert
          variant={notice.tone === "danger" ? "destructive" : "default"}
          className="mb-4"
        >
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-4 relative max-w-xs">
        <Search
          className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por cliente, agencia o estado"
          aria-label="Buscar envíos"
          className="pl-9"
        />
      </div>

      <Card className="py-0">
        <CardContent className="px-0">
          {isLoading ? (
            <div className="grid gap-3 p-6">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-11/12" />
              <Skeleton className="h-5 w-4/5" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              icon={Package}
              title={search ? "Sin resultados" : "Aún no hay envíos"}
              hint={
                search
                  ? "Ningún envío coincide con la búsqueda."
                  : canCreate
                    ? "Registra la primera encomienda para empezar a mover la red."
                    : "Para registrar envíos necesitas al menos un usuario y una agencia."
              }
              action={
                search || !canCreate ? undefined : (
                  <Button variant="outline" onClick={openCreate}>
                    <Plus data-icon="inline-start" aria-hidden="true" />
                    Registrar envío
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Envío</TableHead>
                  <TableHead>Ruta</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Cliente
                  </TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Recibido
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-24 pr-6 text-right">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const client = userById.get(order.user_id);
                  const origin = agencyById.get(order.origin_agency_id);
                  const destination = agencyById.get(
                    order.destination_agency_id,
                  );

                  return (
                    <TableRow key={order.id}>
                      <TableCell className="max-w-56 pl-6">
                        <span className="block truncate font-medium">
                          {order.description}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 whitespace-nowrap">
                          {origin?.name ?? "—"}
                          <ArrowRight
                            className="size-3.5 text-muted-foreground"
                            aria-hidden="true"
                          />
                          {destination?.name ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {client?.email ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatAmount(order.amount)}
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">
                        {formatDate(order.date_received)}
                      </TableCell>
                      <TableCell>
                        <OrderStatusPill status={order.status} />
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Editar envío ${order.description}`}
                            onClick={() => openEdit(order)}
                          >
                            <Pencil aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Eliminar envío ${order.description}`}
                            onClick={() => setOrderToDelete(order)}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingOrder ? "Editar envío" : "Registrar envío"}
            </DialogTitle>
            <DialogDescription>
              Indica el cliente, la ruta entre agencias y los datos de la
              encomienda.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="order-description">Descripción</Label>
              <Input
                id="order-description"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Caja mediana con repuestos"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="order-client">Cliente</Label>
              <Select
                items={users.map((user) => ({
                  value: user.id,
                  label: user.email,
                }))}
                value={form.user_id}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    user_id: value as string,
                  }))
                }
              >
                <SelectTrigger id="order-client" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="order-origin">Agencia de origen</Label>
                <Select
                  items={agencies.map((agency) => ({
                    value: agency.id,
                    label: agency.name,
                  }))}
                  value={form.origin_agency_id}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      origin_agency_id: value as string,
                    }))
                  }
                >
                  <SelectTrigger id="order-origin" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {agencies.map((agency) => (
                      <SelectItem key={agency.id} value={agency.id}>
                        {agency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="order-destination">Agencia de destino</Label>
                <Select
                  items={agencies.map((agency) => ({
                    value: agency.id,
                    label: agency.name,
                  }))}
                  value={form.destination_agency_id}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      destination_agency_id: value as string,
                    }))
                  }
                >
                  <SelectTrigger id="order-destination" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {agencies.map((agency) => (
                      <SelectItem key={agency.id} value={agency.id}>
                        {agency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="order-received">Fecha de recepción</Label>
                <Input
                  id="order-received"
                  type="date"
                  value={form.date_received}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      date_received: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="order-arrived">Fecha estimada de llegada</Label>
                <Input
                  id="order-arrived"
                  type="date"
                  value={form.date_arrived}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      date_arrived: event.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="order-amount">Monto (USD)</Label>
                <Input
                  id="order-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  placeholder="25.00"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="order-status">Estado</Label>
                <Select
                  items={ORDER_STATUSES.map((status) => ({
                    value: status,
                    label: orderStatusLabel(status),
                  }))}
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      status: value as TransferStatus,
                    }))
                  }
                >
                  <SelectTrigger id="order-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {orderStatusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formError && (
              <Alert variant="destructive">
                <AlertDescription className="whitespace-pre-line">
                  {formError}
                </AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving
                  ? "Guardando…"
                  : editingOrder
                    ? "Guardar cambios"
                    : "Registrar envío"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(orderToDelete)}
        onOpenChange={(open) => !open && setOrderToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este envío?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el envío "{orderToDelete?.description}". Esta acción
              no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void handleDelete()}
            >
              Eliminar envío
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
