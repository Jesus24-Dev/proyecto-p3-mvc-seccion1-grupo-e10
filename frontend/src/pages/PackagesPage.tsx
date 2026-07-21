import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  Boxes,
  Check,
  Copy,
  ImageIcon,
  Pencil,
  Route,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
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
import { ariaSort, SortButton, useSortable } from "@/hooks/useSortable";
import { useActiveAgency } from "@/context/AgencyContext";
import { PACKAGE_STATUSES, packageStatusLabel } from "@/lib/format";
import type { Package, PackageStatus } from "@/types";

const NO_ORDER = "none";

type FormState = {
  description: string;
  weight_kg: string;
  // Dimensiones en campos separados (cm). Se componen en la cadena "L × A × H cm".
  length_cm: string;
  width_cm: string;
  height_cm: string;
  contact_id: string;
  order_id: string;
  status: PackageStatus;
  image_urls: string[];
};

const emptyForm: FormState = {
  description: "",
  weight_kg: "",
  length_cm: "",
  width_cm: "",
  height_cm: "",
  contact_id: "",
  order_id: NO_ORDER,
  status: "RECEIVED",
  image_urls: [],
};

// Compone las dimensiones a partir de los tres campos (vacío si no hay ninguno).
function composeDimensions(l: string, w: string, h: string): string {
  const parts = [l, w, h].map((v) => v.trim());
  if (parts.every((v) => !v)) return "";
  return `${parts.map((v) => v || "?").join(" × ")} cm`;
}

// Extrae largo/ancho/alto de una cadena "30 × 20 × 15 cm" para editar.
function parseDimensions(value: string): {
  length_cm: string;
  width_cm: string;
  height_cm: string;
} {
  const nums = (value.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) =>
    n.replace(",", "."),
  );
  return {
    length_cm: nums[0] ?? "",
    width_cm: nums[1] ?? "",
    height_cm: nums[2] ?? "",
  };
}

// Lee un archivo de imagen y lo reduce (máx 1600px, JPEG 0.8) antes de
// convertirlo a data-URI, para no guardar fotos de varios MB en la base.
const MAX_IMAGE_DIMENSION = 1600;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(
          1,
          MAX_IMAGE_DIMENSION / Math.max(img.width, img.height),
        );
        // Si ya es pequeña, conserva el original tal cual.
        if (scale >= 1) {
          resolve(String(reader.result));
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => reject(new Error("No se pudo procesar la imagen."));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}

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
      <Link
        to={`/admin/packages/${encodeURIComponent(code)}`}
        className="font-mono text-xs font-medium underline-offset-2 hover:text-primary hover:underline"
        aria-label={`Ver recorrido de ${code}`}
      >
        {code}
      </Link>
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
  const [allPackages, contacts, orders, users] = data ?? [[], [], [], []];
  const runMutation = useMutationHandler();
  const { activeAgencyId } = useActiveAgency();

  // Alcance de subcuenta: paquetes cuyo envío toca la agencia activa.
  // Los paquetes sin envío pertenecen a la red y solo se ven en "Todas".
  const packages = useMemo(() => {
    if (!activeAgencyId) {
      return allPackages;
    }

    const scopedOrderIds = new Set(
      orders
        .filter(
          (order) =>
            order.origin_agency_id === activeAgencyId ||
            order.destination_agency_id === activeAgencyId,
        )
        .map((order) => order.id),
    );

    return allPackages.filter(
      (item) => item.order_id !== null && scopedOrderIds.has(item.order_id),
    );
  }, [allPackages, orders, activeAgencyId]);

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

  // Alta rápida de contacto dentro del diálogo de paquete.
  const [showNewContact, setShowNewContact] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [newContact, setNewContact] = useState({
    email: "",
    first_name: "",
    last_name: "",
    address: "",
    birthday: "",
  });

  async function submitNewContact() {
    if (!newContact.first_name.trim() || !newContact.last_name.trim()) {
      setContactError("Ingresa al menos nombre y apellido.");
      return;
    }
    if (!newContact.address.trim() || !newContact.birthday) {
      setContactError("La dirección y la fecha de nacimiento son obligatorias.");
      return;
    }
    setContactSaving(true);
    setContactError(null);
    let createdId: string | null = null;
    const failure = await runMutation(async () => {
      const created = await contactsApi.create({
        email: newContact.email.trim() || undefined,
        first_name: newContact.first_name.trim(),
        last_name: newContact.last_name.trim(),
        address: newContact.address.trim(),
        birthday: newContact.birthday,
      });
      createdId = created.id;
    });
    setContactSaving(false);
    if (failure) {
      setContactError(failure);
      return;
    }
    await reload();
    if (createdId) {
      setForm((current) => ({ ...current, contact_id: createdId! }));
    }
    setShowNewContact(false);
    setNewContact({
      email: "",
      first_name: "",
      last_name: "",
      address: "",
      birthday: "",
    });
  }

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

  const {
    sorted: sortedPackages,
    sortKey,
    direction,
    toggle,
  } = useSortable(filteredPackages, {
    tracking: (item) => item.tracking_code,
    description: (item) => item.description,
    contact: (item) => contactLabel(item.contact_id),
    weight: (item) => item.weight_kg,
    status: (item) => packageStatusLabel(item.status),
  });

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
      ...parseDimensions(item.dimensions),
      contact_id: item.contact_id,
      order_id: item.order_id ?? NO_ORDER,
      status: item.status,
      image_urls: item.image_urls ?? [],
    });
    setFormError(null);
    setIsFormOpen(true);
  }

  async function addImages(files: FileList | null) {
    if (!files || files.length === 0) return;
    try {
      const urls = await Promise.all(
        Array.from(files)
          .filter((f) => f.type.startsWith("image/"))
          .map(readAsDataUrl),
      );
      setForm((current) => ({
        ...current,
        image_urls: [...current.image_urls, ...urls],
      }));
    } catch {
      setFormError("No se pudo cargar una de las imágenes.");
    }
  }

  function removeImage(index: number) {
    setForm((current) => ({
      ...current,
      image_urls: current.image_urls.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFormError(null);

    const payload = {
      description: form.description,
      weight_kg: Number(form.weight_kg),
      dimensions: composeDimensions(
        form.length_cm,
        form.width_cm,
        form.height_cm,
      ),
      contact_id: form.contact_id,
      ...(form.order_id !== NO_ORDER ? { order_id: form.order_id } : {}),
      status: form.status,
      image_urls: form.image_urls,
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
                  <TableHead className="w-14 pl-6">Foto</TableHead>
                  <TableHead
                    aria-sort={ariaSort("tracking", sortKey, direction)}
                  >
                    <SortButton
                      label="Rastreo"
                      columnKey="tracking"
                      sortKey={sortKey}
                      direction={direction}
                      onToggle={toggle}
                    />
                  </TableHead>
                  <TableHead
                    aria-sort={ariaSort("description", sortKey, direction)}
                  >
                    <SortButton
                      label="Descripción"
                      columnKey="description"
                      sortKey={sortKey}
                      direction={direction}
                      onToggle={toggle}
                    />
                  </TableHead>
                  <TableHead
                    className="hidden md:table-cell"
                    aria-sort={ariaSort("contact", sortKey, direction)}
                  >
                    <SortButton
                      label="Destinatario"
                      columnKey="contact"
                      sortKey={sortKey}
                      direction={direction}
                      onToggle={toggle}
                    />
                  </TableHead>
                  <TableHead
                    className="text-right"
                    aria-sort={ariaSort("weight", sortKey, direction)}
                  >
                    <SortButton
                      label="Peso"
                      columnKey="weight"
                      sortKey={sortKey}
                      direction={direction}
                      onToggle={toggle}
                    />
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Envío</TableHead>
                  <TableHead aria-sort={ariaSort("status", sortKey, direction)}>
                    <SortButton
                      label="Estado"
                      columnKey="status"
                      sortKey={sortKey}
                      direction={direction}
                      onToggle={toggle}
                    />
                  </TableHead>
                  <TableHead className="w-24 pr-6 text-right">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPackages.map((item) => {
                  const contact = contactById.get(item.contact_id);
                  const order = item.order_id
                    ? orderById.get(item.order_id)
                    : null;

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="pl-6">
                        {item.image_urls.length > 0 ? (
                          <span className="relative block size-10 overflow-hidden rounded-md border">
                            <img
                              src={item.image_urls[0]}
                              alt={`Foto de ${item.tracking_code}`}
                              className="size-full object-cover"
                            />
                            {item.image_urls.length > 1 && (
                              <span className="absolute right-0 bottom-0 rounded-tl bg-background/85 px-1 text-[10px] font-medium tabular-nums">
                                {item.image_urls.length}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span
                            className="flex size-10 items-center justify-center rounded-md border bg-muted text-muted-foreground"
                            aria-label="Sin foto del paquete"
                          >
                            <ImageIcon className="size-4" aria-hidden="true" />
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <TrackingCode code={item.tracking_code} />
                      </TableCell>
                      <TableCell className="max-w-52">
                        <span className="block truncate font-medium">
                          {item.description}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {contact ? (
                          <Link
                            to={`/admin/contacts/${contact.id}`}
                            className="grid gap-0.5 rounded-sm outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
                          >
                            <span className="font-medium underline-offset-4 hover:underline">
                              {contact.first_name} {contact.last_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {userById.get(contact.user_id)?.email ?? ""}
                            </span>
                          </Link>
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
                            nativeButton={false}
                            aria-label={`Ver recorrido de ${item.tracking_code}`}
                            title="Ver recorrido"
                            render={
                              <Link
                                to={`/admin/packages/${encodeURIComponent(item.tracking_code)}`}
                              />
                            }
                          >
                            <Route aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Editar paquete ${item.tracking_code}`}
                            title="Editar"
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
            <div className="grid gap-2">
              <Label>Dimensiones (cm)</Label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { key: "length_cm", label: "Largo" },
                    { key: "width_cm", label: "Ancho" },
                    { key: "height_cm", label: "Alto" },
                  ] as const
                ).map((field) => (
                  <div key={field.key} className="grid gap-1">
                    <Input
                      type="number"
                      min={0}
                      step="0.1"
                      inputMode="decimal"
                      aria-label={`${field.label} en centímetros`}
                      value={form[field.key]}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                      placeholder={field.label}
                    />
                    <span className="text-center text-xs text-muted-foreground">
                      {field.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="package-images">Fotos del paquete</Label>
              <div className="flex flex-wrap items-center gap-2">
                {form.image_urls.map((url, index) => (
                  <span
                    key={index}
                    className="group relative size-16 overflow-hidden rounded-md border"
                  >
                    <img
                      src={url}
                      alt={`Foto ${index + 1}`}
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      aria-label={`Quitar foto ${index + 1}`}
                      onClick={() => removeImage(index)}
                      className="absolute top-0.5 right-0.5 rounded-full bg-background/80 p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </span>
                ))}
                <label
                  htmlFor="package-images"
                  className="flex size-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  <span className="text-[10px]">Añadir</span>
                </label>
                <input
                  id="package-images"
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(event) => {
                    void addImages(event.target.files);
                    event.target.value = "";
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Evidencia del contenido o estado del paquete.
              </p>
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
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="package-contact">Contacto destinatario</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowNewContact((open) => !open);
                    setContactError(null);
                  }}
                >
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  {showNewContact ? "Cancelar" : "Crear contacto"}
                </Button>
              </div>
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

              {showNewContact && (
                <div className="mt-1 grid gap-3 rounded-lg border border-dashed p-3">
                  {contactError && (
                    <Alert variant="destructive">
                      <AlertDescription>{contactError}</AlertDescription>
                    </Alert>
                  )}
                  <div className="grid gap-2">
                    <Label htmlFor="new-contact-email">
                      Correo electrónico (opcional)
                    </Label>
                    <Input
                      id="new-contact-email"
                      type="email"
                      value={newContact.email}
                      onChange={(event) =>
                        setNewContact((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="contacto@correo.com"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-2">
                      <Label htmlFor="new-contact-first">Nombre</Label>
                      <Input
                        id="new-contact-first"
                        value={newContact.first_name}
                        onChange={(event) =>
                          setNewContact((current) => ({
                            ...current,
                            first_name: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="new-contact-last">Apellido</Label>
                      <Input
                        id="new-contact-last"
                        value={newContact.last_name}
                        onChange={(event) =>
                          setNewContact((current) => ({
                            ...current,
                            last_name: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-2">
                      <Label htmlFor="new-contact-address">Dirección</Label>
                      <Input
                        id="new-contact-address"
                        value={newContact.address}
                        onChange={(event) =>
                          setNewContact((current) => ({
                            ...current,
                            address: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="new-contact-birthday">Nacimiento</Label>
                      <Input
                        id="new-contact-birthday"
                        type="date"
                        value={newContact.birthday}
                        onChange={(event) =>
                          setNewContact((current) => ({
                            ...current,
                            birthday: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="justify-self-start"
                    onClick={() => void submitNewContact()}
                    disabled={contactSaving}
                  >
                    {contactSaving ? "Guardando…" : "Guardar contacto"}
                  </Button>
                </div>
              )}
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
