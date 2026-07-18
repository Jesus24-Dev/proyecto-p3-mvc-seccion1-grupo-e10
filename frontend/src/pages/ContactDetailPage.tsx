import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Boxes,
  Cake,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Package as PackageIcon,
  Phone,
  Plus,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import {
  agenciesApi,
  automationsApi,
  contactsApi,
  membershipsApi,
  ordersApi,
  packagesApi,
  tagsApi,
  usersApi,
} from "@/api";
import { OrderStatusPill, PackageStatusPill } from "@/components/shared/pills";
import { ClientNotes } from "@/components/contacts/ClientNotes";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { usePageData, useMutationHandler } from "@/hooks/usePageData";
import { formatAmount, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AutomationRunStatus, ContactRun } from "@/types";

// Estilo del estado de una inscripción en la ficha del contacto.
function runMeta(status: AutomationRunStatus): {
  label: string;
  className: string;
  icon: typeof CheckCircle2;
} {
  switch (status) {
    case "COMPLETED":
      return {
        label: "Completada",
        className: "bg-success text-success-foreground",
        icon: CheckCircle2,
      };
    case "RUNNING":
    case "WAITING":
      return {
        label: "En curso",
        className: "bg-info text-info-foreground",
        icon: Clock,
      };
    default:
      return {
        label: status === "FAILED" ? "Falló" : "Salió",
        className: "bg-muted text-muted-foreground",
        icon: LogOut,
      };
  }
}

export function ContactDetailPage() {
  const { contactId } = useParams();

  const { data, isLoading, error } = usePageData(() =>
    Promise.all([
      contactsApi.list(),
      usersApi.list(),
      packagesApi.list(),
      membershipsApi.list(),
      agenciesApi.list(),
      automationsApi.list(),
      ordersApi.list(),
      tagsApi.list(),
      contactId
        ? automationsApi.runsByContact(contactId)
        : Promise.resolve([] as ContactRun[]),
    ]),
  );
  const [
    contacts,
    users,
    packages,
    memberships,
    agencies,
    ,
    orders,
    tagCatalog,
    contactRuns,
  ] = data ?? [[], [], [], [], [], [], [], [], []];

  const runMutation = useMutationHandler();
  // Etiquetas del contacto en estado local, para agregar/quitar sin recargar.
  const [tags, setTags] = useState<string[]>([]);

  const contact = useMemo(
    () => contacts.find((item) => item.id === contactId) ?? null,
    [contacts, contactId],
  );

  const account = useMemo(
    () => users.find((user) => user.id === contact?.user_id) ?? null,
    [users, contact],
  );

  // Sincroniza las etiquetas locales cuando carga (o cambia) el contacto.
  useEffect(() => {
    if (contact) {
      setTags(contact.tags);
    }
  }, [contact]);

  // Etiquetas del catálogo aún no aplicadas a este contacto.
  const availableTags = useMemo(
    () =>
      [...new Set(tagCatalog.map((tag) => tag.name))]
        .filter((name) => !tags.includes(name))
        .sort((a, b) => a.localeCompare(b, "es")),
    [tagCatalog, tags],
  );

  async function handleAddTag(tag: string) {
    if (!contact || tags.includes(tag)) {
      return;
    }
    const failure = await runMutation(async () => {
      const res = await contactsApi.addTag(contact.id, tag);
      setTags(res.tags);
    });
    if (failure) {
      toast.error("No se pudo agregar la etiqueta", { description: failure });
    } else {
      toast.success(`Etiqueta #${tag} agregada`);
    }
  }

  async function handleRemoveTag(tag: string) {
    if (!contact) {
      return;
    }
    const failure = await runMutation(async () => {
      const res = await contactsApi.removeTag(contact.id, tag);
      setTags(res.tags);
    });
    if (failure) {
      toast.error("No se pudo quitar la etiqueta", { description: failure });
    } else {
      toast.success(`Etiqueta #${tag} quitada`);
    }
  }

  const contactPackages = useMemo(
    () => packages.filter((item) => item.contact_id === contactId),
    [packages, contactId],
  );

  // Envíos (órdenes) del contacto, por su cuenta de usuario.
  const contactOrders = useMemo(
    () =>
      [...orders]
        .filter((order) => order.user_id === contact?.user_id)
        .sort(
          (a, b) =>
            new Date(b.date_received).getTime() -
            new Date(a.date_received).getTime(),
        ),
    [orders, contact],
  );

  const totalInvested = useMemo(
    () => contactOrders.reduce((sum, order) => sum + order.amount, 0),
    [contactOrders],
  );

  const agencyById = useMemo(
    () => new Map(agencies.map((agency) => [agency.id, agency])),
    [agencies],
  );

  const contactAgencies = useMemo(() => {
    const agencyById = new Map(agencies.map((agency) => [agency.id, agency]));
    return memberships
      .filter((membership) => membership.user_id === contact?.user_id)
      .map((membership) => agencyById.get(membership.agency_id))
      .filter((agency): agency is (typeof agencies)[number] => Boolean(agency));
  }, [memberships, agencies, contact]);

  if (isLoading) {
    return <Skeleton className="h-96 rounded-xl" />;
  }

  if (error || !contact) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link to="/admin/contacts" />}
        >
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          Volver a contactos
        </Button>
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>
            {error ?? "El contacto solicitado no existe."}
          </AlertDescription>
        </Alert>
      </>
    );
  }

  const fullName = `${contact.first_name} ${contact.last_name}`;
  const initials =
    `${contact.first_name[0] ?? ""}${contact.last_name[0] ?? ""}`.toUpperCase();

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        className="mb-4"
        render={<Link to="/admin/contacts" />}
      >
        <ArrowLeft data-icon="inline-start" aria-hidden="true" />
        Volver a contactos
      </Button>

      <div className="mb-6 flex items-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
          {initials}
        </span>
        <div>
          <h2 className="text-2xl font-medium tracking-tight">{fullName}</h2>
          <p className="text-sm text-muted-foreground">
            {account?.email ?? "Sin cuenta asociada"}
          </p>
        </div>
        <Button
          className="ms-auto"
          nativeButton={false}
          render={<Link to="/admin/conversations" />}
        >
          <MessageCircle data-icon="inline-start" aria-hidden="true" />
          Abrir conversación
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="gap-3 py-5">
          <CardContent className="grid gap-1 px-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">
                USD invertido
              </span>
              <DollarSign
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <span className="text-3xl font-medium tracking-tight tabular-nums">
              {formatAmount(totalInvested)}
            </span>
            <span className="text-xs text-muted-foreground">
              Suma de sus envíos
            </span>
          </CardContent>
        </Card>
        <Card className="gap-3 py-5">
          <CardContent className="grid gap-1 px-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Envíos</span>
              <PackageIcon
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <span className="text-3xl font-medium tracking-tight tabular-nums">
              {contactOrders.length}
            </span>
            <span className="text-xs text-muted-foreground">
              Órdenes a su nombre
            </span>
          </CardContent>
        </Card>
        <Card className="gap-3 py-5">
          <CardContent className="grid gap-1 px-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Paquetes</span>
              <Boxes
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <span className="text-3xl font-medium tracking-tight tabular-nums">
              {contactPackages.length}
            </span>
            <span className="text-xs text-muted-foreground">
              A nombre del contacto
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Ficha</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {contact.document_id && (
              <div className="flex items-center gap-2">
                <CreditCard
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                {contact.document_id}
              </div>
            )}
            {account?.email && (
              <div className="flex items-center gap-2">
                <Mail
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                {account.email}
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2">
                <Phone
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                {contact.phone}
              </div>
            )}
            <div className="flex items-center gap-2">
              <MapPin
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              {contact.address}
            </div>
            <div className="flex items-center gap-2">
              <Cake
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              {formatDate(contact.birthday)}
            </div>
            <div className="flex items-center gap-2">
              <CalendarClock
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              Cliente desde {formatDate(contact.created_at)}
            </div>
            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">Agencias</p>
              <div className="flex flex-wrap gap-1.5">
                {contactAgencies.length === 0 ? (
                  <span className="text-muted-foreground">Sin agencia</span>
                ) : (
                  contactAgencies.map((agency) => (
                    <Badge key={agency.id} variant="secondary">
                      {agency.name}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">Etiquetas</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {tags.length === 0 && (
                  <span className="text-muted-foreground">Sin etiquetas</span>
                )}
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => void handleRemoveTag(tag)}
                      aria-label={`Quitar etiqueta ${tag}`}
                      className="-mr-0.5 rounded-full text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </span>
                ))}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                        aria-label="Agregar etiqueta"
                      >
                        <Plus className="size-3" aria-hidden="true" />
                        Agregar
                      </button>
                    }
                  />
                  <DropdownMenuContent align="start">
                    {availableTags.length === 0 ? (
                      <DropdownMenuItem disabled>
                        No hay más etiquetas
                      </DropdownMenuItem>
                    ) : (
                      availableTags.map((name) => (
                        <DropdownMenuItem
                          key={name}
                          onClick={() => void handleAddTag(name)}
                        >
                          #{name}
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>

        <ClientNotes contactId={contactId ?? ""} />

        <Card>
          <CardHeader>
            <CardTitle>Paquetes</CardTitle>
            <CardDescription>
              {contactPackages.length} paquete
              {contactPackages.length === 1 ? "" : "s"} a nombre del contacto.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {contactPackages.length === 0 ? (
              <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Boxes className="size-4" aria-hidden="true" />
                Aún no tiene paquetes.
              </p>
            ) : (
              contactPackages.map((item) => (
                <Link
                  key={item.id}
                  to={`/admin/packages/${encodeURIComponent(item.tracking_code)}`}
                  className="flex items-center gap-3 overflow-hidden rounded-lg border px-3 py-2 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Boxes className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {item.description}
                    </span>
                    <span className="block truncate font-mono text-xs text-muted-foreground">
                      {item.tracking_code}
                    </span>
                  </span>
                  <span className="shrink-0">
                    <PackageStatusPill status={item.status} />
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Envíos</CardTitle>
            <CardDescription>
              {contactOrders.length} envío
              {contactOrders.length === 1 ? "" : "s"} ·{" "}
              {formatAmount(totalInvested)} en total.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {contactOrders.length === 0 ? (
              <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <PackageIcon className="size-4" aria-hidden="true" />
                Aún no tiene envíos.
              </p>
            ) : (
              contactOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/admin/orders/${order.id}`}
                  className="flex items-center gap-3 overflow-hidden rounded-lg border px-3 py-2 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <PackageIcon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {order.description}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {agencyById.get(order.origin_agency_id)?.name ?? "—"} →{" "}
                      {agencyById.get(order.destination_agency_id)?.name ?? "—"}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-medium tabular-nums">
                      {formatAmount(order.amount)}
                    </span>
                    <OrderStatusPill status={order.status} />
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automatizaciones</CardTitle>
            <CardDescription>
              {contactRuns.length === 0
                ? "Historial de inscripciones en flujos."
                : `${contactRuns.length} inscripción${contactRuns.length === 1 ? "" : "es"} en flujos.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {contactRuns.length === 0 ? (
              <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Workflow className="size-4" aria-hidden="true" />
                Aún no se ha inscrito en ningún flujo.
              </p>
            ) : (
              contactRuns.slice(0, 8).map((run) => {
                const meta = runMeta(run.status);
                const RunIcon = meta.icon;
                return (
                  <Link
                    key={run.id}
                    to={`/admin/automations/editor/${run.automation_id}`}
                    className="flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Zap className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {run.automation_name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground tabular-nums">
                        {formatDate(run.started_at)}
                      </span>
                    </span>
                    <Badge className={cn("gap-1 shrink-0", meta.className)}>
                      <RunIcon className="size-3" aria-hidden="true" />
                      {meta.label}
                    </Badge>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
