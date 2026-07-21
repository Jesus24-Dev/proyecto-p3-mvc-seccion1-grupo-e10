import { useMemo, useState, type FormEvent } from "react";
import {
  BadgeCheck,
  Banknote,
  CircleSlash,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { contactsApi, packagesApi, paymentsApi } from "@/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
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
import { Badge } from "@/components/ui/badge";
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
import { ariaSort, SortButton, useSortable } from "@/hooks/useSortable";
import { formatAmount, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  Payment,
  PaymentKind,
  PaymentMethod,
  PaymentStatus,
} from "@/types";

const STATUS_META: Record<
  PaymentStatus,
  { label: string; className: string }
> = {
  PENDING: { label: "Pendiente", className: "bg-warning text-warning-foreground" },
  APPROVED: { label: "Aprobado", className: "bg-success text-success-foreground" },
  REJECTED: {
    label: "Rechazado",
    className: "bg-destructive/10 text-destructive",
  },
};

const STATUS_FILTERS: { value: "ALL" | PaymentStatus; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "PENDING", label: "Pendientes" },
  { value: "APPROVED", label: "Aprobados" },
  { value: "REJECTED", label: "Rechazados" },
];

const METHOD_META: Record<PaymentMethod, string> = {
  TRANSFER: "Transferencia",
  MOBILE_PAYMENT: "Pago móvil",
  CASH: "Efectivo",
};

const KIND_META: Record<PaymentKind, { label: string; className: string }> = {
  PREPAID: {
    label: "Envío pagado",
    className: "bg-primary/10 text-primary",
  },
  COLLECT: {
    label: "Cobro destino",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  },
};

const emptyForm = {
  reference: "",
  amount: "",
  paid_at: new Date().toISOString().slice(0, 10),
  contact_id: "",
  package_id: "",
  method: "TRANSFER" as PaymentMethod,
  kind: "PREPAID" as PaymentKind,
  note: "",
};

function contactName(payment: Payment): string {
  if (!payment.contact) return "—";
  return `${payment.contact.first_name} ${payment.contact.last_name}`.trim();
}

export function PaymentsPage() {
  const { data, isLoading, error, reload } = usePageData(() =>
    Promise.all([paymentsApi.list(), contactsApi.list(), packagesApi.list()]),
  );
  const payments = data?.[0] ?? [];
  const contacts = data?.[1] ?? [];
  const packages = data?.[2] ?? [];
  const runMutation = useMutationHandler();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | PaymentStatus>("ALL");
  const [notice, setNotice] = useState<{
    text: string;
    tone: "success" | "danger";
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Payment | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return payments.filter((payment) => {
      if (statusFilter !== "ALL" && payment.status !== statusFilter) {
        return false;
      }
      if (!query) return true;
      return (
        payment.reference.toLowerCase().includes(query) ||
        payment.bank.toLowerCase().includes(query) ||
        contactName(payment).toLowerCase().includes(query)
      );
    });
  }, [payments, search, statusFilter]);

  const { sorted, sortKey, direction, toggle } = useSortable(filtered, {
    reference: (p) => p.reference.toLowerCase(),
    contact: (p) => contactName(p).toLowerCase(),
    amount: (p) => p.amount,
    paid: (p) => p.paid_at,
    status: (p) => STATUS_META[p.status].label,
  });

  const totals = useMemo(() => {
    const pending = payments.filter((p) => p.status === "PENDING");
    const approved = payments.filter((p) => p.status === "APPROVED");
    return {
      pending: pending.length,
      pendingAmount: pending.reduce((sum, p) => sum + p.amount, 0),
      approvedAmount: approved.reduce((sum, p) => sum + p.amount, 0),
    };
  }, [payments]);

  function openCreate() {
    setForm({ ...emptyForm, paid_at: new Date().toISOString().slice(0, 10) });
    setFormError(null);
    setIsFormOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // La referencia solo es obligatoria fuera del efectivo.
    if (form.method !== "CASH" && !form.reference.trim()) {
      setFormError("Ingresa la referencia bancaria.");
      return;
    }
    if (!form.contact_id) {
      setFormError("Selecciona el cliente que reporta el pago.");
      return;
    }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("El monto debe ser mayor a 0.");
      return;
    }
    setIsSaving(true);
    setFormError(null);
    const failure = await runMutation(async () => {
      await paymentsApi.create({
        reference: form.reference.trim() || undefined,
        amount,
        paid_at: new Date(form.paid_at).toISOString(),
        contact_id: form.contact_id,
        package_id: form.package_id || undefined,
        method: form.method,
        kind: form.kind,
        note: form.note.trim(),
      });
    });
    setIsSaving(false);
    if (failure) {
      setFormError(failure);
      return;
    }
    setIsFormOpen(false);
    setNotice({ text: "Pago registrado como pendiente.", tone: "success" });
    void reload();
  }

  async function runAction(
    id: string,
    action: () => Promise<unknown>,
    okText: string,
  ) {
    setBusyId(id);
    const failure = await runMutation(async () => {
      await action();
    });
    setBusyId(null);
    setNotice(
      failure
        ? { text: failure, tone: "danger" }
        : { text: okText, tone: "success" },
    );
    void reload();
  }

  async function handleDelete() {
    if (!toDelete) return;
    const target = toDelete;
    setToDelete(null);
    await runAction(
      target.id,
      () => paymentsApi.remove(target.id),
      "Pago eliminado.",
    );
  }

  return (
    <>
      <PageHeader
        title="Transacciones"
        description="Pagos reportados por los clientes y su validación contra el Banco Mercantil (simulada)."
      >
        <Button onClick={openCreate}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          Registrar pago
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

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <SummaryTile
          label="Pagos pendientes"
          value={String(totals.pending)}
          hint={`${formatAmount(totals.pendingAmount)} por validar`}
        />
        <SummaryTile
          label="Ingresos validados"
          value={formatAmount(totals.approvedAmount)}
          hint="Pagos aprobados"
        />
        <SummaryTile
          label="Total de registros"
          value={String(payments.length)}
          hint="Transacciones en el sistema"
        />
      </div>

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
            placeholder="Buscar por referencia, banco o cliente"
            aria-label="Buscar pagos"
            className="pl-9"
          />
        </div>
        <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={statusFilter === filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                statusFilter === filter.value
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
              icon={Banknote}
              title={search || statusFilter !== "ALL" ? "Sin resultados" : "Aún no hay pagos"}
              hint={
                search || statusFilter !== "ALL"
                  ? "Ningún pago coincide con el filtro."
                  : "Registra un pago reportado por un cliente para validarlo con el banco."
              }
              action={
                search || statusFilter !== "ALL" ? undefined : (
                  <Button variant="outline" onClick={openCreate}>
                    <Plus data-icon="inline-start" aria-hidden="true" />
                    Registrar pago
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="pl-6"
                    aria-sort={ariaSort("reference", sortKey, direction)}
                  >
                    <SortButton
                      label="Referencia"
                      columnKey="reference"
                      sortKey={sortKey}
                      direction={direction}
                      onToggle={toggle}
                    />
                  </TableHead>
                  <TableHead aria-sort={ariaSort("contact", sortKey, direction)}>
                    <SortButton
                      label="Cliente"
                      columnKey="contact"
                      sortKey={sortKey}
                      direction={direction}
                      onToggle={toggle}
                    />
                  </TableHead>
                  <TableHead
                    className="hidden md:table-cell"
                    aria-sort={ariaSort("amount", sortKey, direction)}
                  >
                    <SortButton
                      label="Monto"
                      columnKey="amount"
                      sortKey={sortKey}
                      direction={direction}
                      onToggle={toggle}
                    />
                  </TableHead>
                  <TableHead
                    className="hidden lg:table-cell"
                    aria-sort={ariaSort("paid", sortKey, direction)}
                  >
                    <SortButton
                      label="Fecha pago"
                      columnKey="paid"
                      sortKey={sortKey}
                      direction={direction}
                      onToggle={toggle}
                    />
                  </TableHead>
                  <TableHead aria-sort={ariaSort("status", sortKey, direction)}>
                    <SortButton
                      label="Estado"
                      columnKey="status"
                      sortKey={sortKey}
                      direction={direction}
                      onToggle={toggle}
                    />
                  </TableHead>
                  <TableHead className="w-40 pr-6 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((payment) => {
                  const meta = STATUS_META[payment.status];
                  const busy = busyId === payment.id;
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="pl-6">
                        <span className="font-mono text-sm">{payment.reference}</span>
                        <span className="block text-xs text-muted-foreground">
                          {payment.bank} · {METHOD_META[payment.method]}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        <span className="block">{contactName(payment)}</span>
                        <span className="mt-1 inline-flex items-center gap-1.5">
                          <Badge className={cn("text-[11px]", KIND_META[payment.kind].className)}>
                            {KIND_META[payment.kind].label}
                          </Badge>
                          {payment.package && (
                            <span
                              className="font-mono text-xs text-muted-foreground"
                              title={payment.package.description}
                            >
                              {payment.package.tracking_code}
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="hidden tabular-nums md:table-cell">
                        {formatAmount(payment.amount)}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground tabular-nums lg:table-cell">
                        {formatDate(payment.paid_at)}
                      </TableCell>
                      <TableCell>
                        <Badge className={meta.className}>{meta.label}</Badge>
                      </TableCell>
                      <TableCell className="pr-6">
                        <div className="flex items-center justify-end gap-1">
                          {payment.status === "PENDING" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={busy}
                                aria-label={`Validar pago ${payment.reference}`}
                                onClick={() =>
                                  void runAction(
                                    payment.id,
                                    () => paymentsApi.validate(payment.id),
                                    "Pago validado con el banco.",
                                  )
                                }
                              >
                                <BadgeCheck
                                  data-icon="inline-start"
                                  aria-hidden="true"
                                />
                                Validar
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                disabled={busy}
                                aria-label={`Rechazar pago ${payment.reference}`}
                                onClick={() =>
                                  void runAction(
                                    payment.id,
                                    () => paymentsApi.reject(payment.id),
                                    "Pago rechazado.",
                                  )
                                }
                              >
                                <CircleSlash aria-hidden="true" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Eliminar pago ${payment.reference}`}
                            onClick={() => setToDelete(payment)}
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
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Registrar pago</DialogTitle>
              <DialogDescription>
                El pago queda pendiente hasta validarlo contra el Banco Mercantil.
              </DialogDescription>
            </DialogHeader>
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <Label>Concepto del pago</Label>
              <div className="inline-flex w-full rounded-lg border bg-muted/40 p-0.5">
                {(
                  [
                    { value: "PREPAID", label: "Envío pagado" },
                    { value: "COLLECT", label: "Cobro destino" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={form.kind === option.value}
                    onClick={() =>
                      setForm((c) => ({ ...c, kind: option.value }))
                    }
                    className={cn(
                      "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      form.kind === option.value
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {form.kind === "PREPAID"
                  ? "El remitente paga el envío en origen."
                  : "El destinatario paga al recibir el paquete."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="pay-method">Medio de pago</Label>
                <Select
                  items={(
                    Object.keys(METHOD_META) as PaymentMethod[]
                  ).map((value) => ({ value, label: METHOD_META[value] }))}
                  value={form.method}
                  onValueChange={(value) =>
                    setForm((c) => ({ ...c, method: value as PaymentMethod }))
                  }
                >
                  <SelectTrigger id="pay-method" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(METHOD_META) as PaymentMethod[]).map((value) => (
                      <SelectItem key={value} value={value}>
                        {METHOD_META[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pay-reference">
                  {form.method === "CASH"
                    ? "Referencia (opcional)"
                    : "Referencia"}
                </Label>
                <Input
                  id="pay-reference"
                  value={form.reference}
                  onChange={(event) =>
                    setForm((c) => ({ ...c, reference: event.target.value }))
                  }
                  placeholder={
                    form.method === "CASH" ? "Recibo / caja" : "p. ej. 01234567"
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pay-package">Paquete (opcional)</Label>
              <Select
                items={[
                  { value: "none", label: "Sin paquete" },
                  ...packages.map((pkg) => ({
                    value: pkg.id,
                    label: `${pkg.tracking_code} · ${pkg.description}`,
                  })),
                ]}
                value={form.package_id || "none"}
                onValueChange={(value) => {
                  const packageId = value === "none" ? "" : (value ?? "");
                  const pkg = packages.find((p) => p.id === packageId);
                  setForm((c) => ({
                    ...c,
                    package_id: packageId,
                    // Al elegir un paquete, hereda su contacto destinatario.
                    contact_id: pkg ? pkg.contact_id : c.contact_id,
                  }));
                }}
              >
                <SelectTrigger id="pay-package" className="w-full">
                  <SelectValue placeholder="Sin paquete" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin paquete</SelectItem>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.tracking_code} · {pkg.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pay-contact">Cliente</Label>
              <Select
                items={contacts.map((contact) => ({
                  value: contact.id,
                  label: `${contact.first_name} ${contact.last_name}`,
                }))}
                value={form.contact_id}
                onValueChange={(value) =>
                  setForm((c) => ({ ...c, contact_id: value ?? "" }))
                }
              >
                <SelectTrigger id="pay-contact" className="w-full">
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="pay-amount">Monto (USD)</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((c) => ({ ...c, amount: event.target.value }))
                  }
                  placeholder="25.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pay-date">Fecha del pago</Label>
                <Input
                  id="pay-date"
                  type="date"
                  value={form.paid_at}
                  onChange={(event) =>
                    setForm((c) => ({ ...c, paid_at: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pay-note">Nota (opcional)</Label>
              <Input
                id="pay-note"
                value={form.note}
                onChange={(event) =>
                  setForm((c) => ({ ...c, note: event.target.value }))
                }
                placeholder="Detalle o comentario"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Guardando…" : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el registro de la referencia {toDelete?.reference}.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void handleDelete()}
            >
              Eliminar pago
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SummaryTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="py-4">
      <CardContent className="px-5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
