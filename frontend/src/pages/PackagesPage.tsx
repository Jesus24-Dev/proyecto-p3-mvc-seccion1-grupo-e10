import { useMemo, useState, type FormEvent } from "react";
import { Boxes, Check, Copy, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { contactsApi, ordersApi, packagesApi, usersApi } from "@/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { PackageStatusPill } from "@/components/shared/pills";
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
import { PACKAGE_STATUSES, packageStatusLabel } from "@/lib/format";
import type { Package, PackageStatus } from "@/types";

const NO_ORDER = "none";

type FormState = {
  description: string;
  weight_kg: string;
  contact_id: string;
  order_id: string;
  status: PackageStatus;
};

const emptyForm: FormState = {
  description: "",
  weight_kg: "",
  contact_id: "",
  order_id: NO_ORDER,
  status: "RECEIVED",
};

function TrackingCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // El portapapeles puede no estar disponible; el código sigue visible.
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <code className="font-mono text-xs font-medium">{code}</code>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Copiar código ${code}`}
        onClick={() => void copy()}
      >
        {copied ? (
          <Check className="text-emerald-700" aria-hidden="true" />
        ) : (
          <Copy aria-hidden="true" />
        )}
      </Button>
    </span>
  );
}

export function PackagesPage() {
  const { data, isLoading, error, reload } = usePageData(() =>
    Promise.all([
      packagesApi.list(),
      contactsApi.list(),
      ordersApi.list(),
      usersApi.list(),
    ]),
  );
  const [packages, contacts, orders, users] = data ?? [[], [], [], []];
  const runMutation = useMutationHandler();

  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<Package | null>(null);
  const [notice, setNotice] = useState<{
    text: string;
    tone: "success" | "danger";
  } | null>(null);

  const contactById = useMemo(
    () => new Map(contacts.map((contact) => [contact.id, contact])),
    [contacts],
  );
  const orderById = useMemo(
    () => new Map(orders.map((order) => [order.id, order])),
    [orders],
  );
  const userById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );

  const contactLabel = useMemo(
    () => (contactId: string) => {
      const contact = contactById.get(contactId);
      if (!contact) {
        return "—";
      }
      return `${contact.first_name} ${contact.last_name}`;
    },
    [contactById],
  );

  const filteredPackages = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return packages;
    }

    return packages.filter((item) => {
      const contact = contactById.get(item.contact_id);

      return (
        item.tracking_code.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        packageStatusLabel(item.status).toLowerCase().includes(query) ||
        `${contact?.first_name ?? ""} ${contact?.last_name ?? ""}`
          .toLowerCase()
          .includes(query)
      );
    });
  }, [packages, search, contactById]);

  const canCreate = contacts.length > 0;

  function openCreate() {
    setEditingPackage(null);
    setForm({ ...emptyForm, contact_id: contacts[0]?.id ?? "" });
    setFormError(null);
    setIsFormOpen(true);
  }

  function openEdit(item: Package) {
    setEditingPackage(item);
    setForm({
      description: item.description,
      weight_kg: String(item.weight_kg),
      contact_id: item.contact_id,
      order_id: item.order_id ?? NO_ORDER,
      status: item.status,
    });
    setFormError(null);
    setIsFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFormError(null);

    const payload = {
      description: form.description,
      weight_kg: Number(form.weight_kg),
      contact_id: form.contact_id,
      ...(form.order_id !== NO_ORDER ? { order_id: form.order_id } : {}),
      status: form.status,
    };

    let createdTracking: string | null = null;
    const failure = await runMutation(async () => {
      if (editingPackage) {
        await packagesApi.update(editingPackage.id, payload);
      } else {
        const created = await packagesApi.create(payload);
        createdTracking = created.tracking_code;
      }
    });

    setIsSaving(false);

    if (failure) {
      setFormError(failure);
      return;
    }

    setIsFormOpen(false);
    setNotice({
      text: editingPackage
        ? "Paquete actualizado correctamente."
        : `Paquete registrado con el código de rastreo ${createdTracking}.`,
      tone: "success",
    });
    void reload();
  }

  async function handleDelete() {
    if (!packageToDelete) {
      return;
    }

    const failure = await runMutation(() =>
      packagesApi.remove(packageToDelete.id),
    );
    setPackageToDelete(null);
    setNotice(
      failure
        ? { text: failure, tone: "danger" }
        : { text: "Paquete eliminado correctamente.", tone: "success" },
    );
    void reload();
  }

  return (
    <>
      <PageHeader
        title="Paquetes"
        description="Cada paquete físico de la red, con su código de rastreo, destinatario y envío asignado."
      >
        <Button onClick={openCreate} disabled={!canCreate}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          Registrar paquete
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
          placeholder="Buscar por código, contacto o estado"
          aria-label="Buscar paquetes"
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
          ) : filteredPackages.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title={search ? "Sin resultados" : "Aún no hay paquetes"}
              hint={
                search
                  ? "Ningún paquete coincide con la búsqueda."
                  : canCreate
                    ? "Registra el primer paquete para generar su código de rastreo."
                    : "Para registrar paquetes necesitas al menos un contacto."
              }
              action={
                search || !canCreate ? undefined : (
                  <Button variant="outline" onClick={openCreate}>
                    <Plus data-icon="inline-start" aria-hidden="true" />
                    Registrar paquete
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Rastreo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Destinatario
                  </TableHead>
                  <TableHead className="text-right">Peso</TableHead>
                  <TableHead className="hidden lg:table-cell">Envío</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-24 pr-6 text-right">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPackages.map((item) => {
                  const contact = contactById.get(item.contact_id);
                  const order = item.order_id
                    ? orderById.get(item.order_id)
                    : null;

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="pl-6 whitespace-nowrap">
                        <TrackingCode code={item.tracking_code} />
                      </TableCell>
                      <TableCell className="max-w-52">
                        <span className="block truncate font-medium">
                          {item.description}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {contact ? (
                          <div className="grid gap-0.5">
                            <span>
                              {contact.first_name} {contact.last_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {userById.get(contact.user_id)?.email ?? ""}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums whitespace-nowrap">
                        {item.weight_kg} kg
                      </TableCell>
                      <TableCell className="hidden max-w-44 truncate text-muted-foreground lg:table-cell">
                        {order?.description ?? "Sin envío"}
                      </TableCell>
                      <TableCell>
                        <PackageStatusPill status={item.status} />
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Editar paquete ${item.tracking_code}`}
                            onClick={() => openEdit(item)}
                          >
                            <Pencil aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Eliminar paquete ${item.tracking_code}`}
                            onClick={() => setPackageToDelete(item)}
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
              {editingPackage ? "Editar paquete" : "Registrar paquete"}
            </DialogTitle>
            <DialogDescription>
              {editingPackage
                ? `Código de rastreo ${editingPackage.tracking_code} (no cambia al editar).`
                : "El código de rastreo se genera automáticamente al registrar."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="package-description">Descripción</Label>
              <Input
                id="package-description"
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="package-weight">Peso (kg)</Label>
                <Input
                  id="package-weight"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.weight_kg}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      weight_kg: event.target.value,
                    }))
                  }
                  placeholder="2.50"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="package-status">Estado</Label>
                <Select
                  items={PACKAGE_STATUSES.map((status) => ({
                    value: status,
                    label: packageStatusLabel(status),
                  }))}
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      status: value as PackageStatus,
                    }))
                  }
                >
                  <SelectTrigger id="package-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PACKAGE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {packageStatusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="package-contact">Contacto destinatario</Label>
              <Select
                items={contacts.map((contact) => ({
                  value: contact.id,
                  label: `${contact.first_name} ${contact.last_name}`,
                }))}
                value={form.contact_id}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    contact_id: value as string,
                  }))
                }
              >
                <SelectTrigger id="package-contact" className="w-full">
                  <SelectValue />
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
            <div className="grid gap-2">
              <Label htmlFor="package-order">Envío asignado</Label>
              <Select
                items={[
                  { value: NO_ORDER, label: "Sin envío por ahora" },
                  ...orders.map((order) => ({
                    value: order.id,
                    label: order.description,
                  })),
                ]}
                value={form.order_id}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    order_id: value as string,
                  }))
                }
              >
                <SelectTrigger id="package-order" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ORDER}>Sin envío por ahora</SelectItem>
                  {orders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Puedes asignarlo a un envío más adelante, cuando se despache.
              </p>
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
                  : editingPackage
                    ? "Guardar cambios"
                    : "Registrar paquete"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(packageToDelete)}
        onOpenChange={(open) => !open && setPackageToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este paquete?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el paquete {packageToDelete?.tracking_code} y su
              código de rastreo dejará de ser válido. Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void handleDelete()}
            >
              Eliminar paquete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
