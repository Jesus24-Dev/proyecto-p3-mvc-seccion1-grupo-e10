import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Boxes,
  Cake,
  MapPin,
  MessageCircle,
  Workflow,
  Zap,
} from "lucide-react";
import {
  agenciesApi,
  automationsApi,
  contactsApi,
  membershipsApi,
  packagesApi,
  usersApi,
} from "@/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { PackageStatusPill } from "@/components/shared/pills";
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
import { Skeleton } from "@/components/ui/skeleton";
import { usePageData } from "@/hooks/usePageData";
import { formatDate } from "@/lib/format";
import type { StepData } from "@/lib/automationSteps";

export function ContactDetailPage() {
  const { contactId } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = usePageData(() =>
    Promise.all([
      contactsApi.list(),
      usersApi.list(),
      packagesApi.list(),
      membershipsApi.list(),
      agenciesApi.list(),
      automationsApi.list(),
    ]),
  );
  const [contacts, users, packages, memberships, agencies, automations] =
    data ?? [[], [], [], [], [], []];

  const contact = useMemo(
    () => contacts.find((item) => item.id === contactId) ?? null,
    [contacts, contactId],
  );

  const account = useMemo(
    () => users.find((user) => user.id === contact?.user_id) ?? null,
    [users, contact],
  );

  const contactPackages = useMemo(
    () => packages.filter((item) => item.contact_id === contactId),
    [packages, contactId],
  );

  const contactAgencies = useMemo(() => {
    const agencyById = new Map(agencies.map((agency) => [agency.id, agency]));
    return memberships
      .filter((membership) => membership.user_id === contact?.user_id)
      .map((membership) => agencyById.get(membership.agency_id))
      .filter((agency): agency is (typeof agencies)[number] => Boolean(agency));
  }, [memberships, agencies, contact]);

  // Automatizaciones activas cuyo disparador aplica a contactos.
  const contactAutomations = useMemo(
    () =>
      automations.filter((automation) => {
        if (!automation.is_active) {
          return false;
        }
        const trigger = automation.definition.nodes.find(
          (node) => (node.data as StepData | undefined)?.kind === "trigger",
        );
        const triggerKind = (trigger?.data as StepData | undefined)?.trigger;
        return (
          triggerKind === "contact_created" || triggerKind === "tag_added"
        );
      }),
    [automations],
  );

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
          render={<Link to="/admin/contactos" />}
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
        render={<Link to="/admin/contactos" />}
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
          render={<Link to="/admin/conversaciones" />}
        >
          <MessageCircle data-icon="inline-start" aria-hidden="true" />
          Abrir conversación
        </Button>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Ficha</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
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
              <div className="flex flex-wrap gap-1.5">
                {contact.tags.length === 0 ? (
                  <span className="text-muted-foreground">Sin etiquetas</span>
                ) : (
                  contact.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      #{tag}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

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
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate("/admin/paquetes")}
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
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automatizaciones</CardTitle>
            <CardDescription>
              Flujos activos que aplican a este contacto.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {contactAutomations.length === 0 ? (
              <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Workflow className="size-4" aria-hidden="true" />
                No está en ningún flujo activo.
              </p>
            ) : (
              contactAutomations.map((automation) => (
                <Link
                  key={automation.id}
                  to={`/admin/automatizaciones/${automation.id}`}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Zap className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {automation.name}
                  </span>
                  <Badge className="bg-emerald-100 text-emerald-900">
                    Activa
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
