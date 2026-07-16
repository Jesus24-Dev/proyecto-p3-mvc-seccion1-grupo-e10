import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Check, Globe, Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { emailDomainsApi, emailTemplatesApi } from "@/api";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveAgency } from "@/context/AgencyContext";
import { useMutationHandler, usePageData } from "@/hooks/usePageData";
import { cn } from "@/lib/utils";
import type { EmailTemplate } from "@/types";

/** Convierte HTML a texto plano para vistas compactas (tarjetas). */
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|h1|h2|h3|li|blockquote)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function EmailBuilderPage() {
  const { activeAgencyId } = useActiveAgency();
  const { data, isLoading, error, reload } = usePageData(() =>
    Promise.all([emailTemplatesApi.list(), emailDomainsApi.list()]),
  );
  const allTemplates = data?.[0] ?? [];
  const allDomains = data?.[1] ?? [];
  const runMutation = useMutationHandler();

  const templates = useMemo(
    () =>
      allTemplates.filter((template) =>
        activeAgencyId ? template.agency_id === activeAgencyId : true,
      ),
    [allTemplates, activeAgencyId],
  );
  const domains = useMemo(
    () =>
      allDomains.filter((domain) =>
        activeAgencyId ? domain.agency_id === activeAgencyId : true,
      ),
    [allDomains, activeAgencyId],
  );

  const [notice, setNotice] = useState<{
    text: string;
    tone: "success" | "danger";
  } | null>(null);

  // --- Dominios ---
  const [newDomain, setNewDomain] = useState("");
  const [domainSaving, setDomainSaving] = useState(false);

  async function addDomain(event: FormEvent) {
    event.preventDefault();
    if (!activeAgencyId || !newDomain.trim()) {
      return;
    }
    setDomainSaving(true);
    const failure = await runMutation(async () => {
      await emailDomainsApi.create({
        domain: newDomain.trim(),
        agency_id: activeAgencyId,
      });
    });
    setDomainSaving(false);
    if (failure) {
      setNotice({ text: failure, tone: "danger" });
      return;
    }
    setNewDomain("");
    void reload();
  }

  async function verifyDomain(id: string) {
    const failure = await runMutation(async () => {
      await emailDomainsApi.verify(id);
    });
    setNotice(
      failure
        ? { text: failure, tone: "danger" }
        : { text: "Dominio verificado.", tone: "success" },
    );
    void reload();
  }

  async function removeDomain(id: string) {
    await runMutation(async () => {
      await emailDomainsApi.remove(id);
    });
    void reload();
  }

  // --- Plantillas ---
  const [toDelete, setToDelete] = useState<EmailTemplate | null>(null);

  async function deleteTemplate() {
    if (!toDelete) {
      return;
    }
    const failure = await runMutation(() => emailTemplatesApi.remove(toDelete.id));
    setToDelete(null);
    setNotice(
      failure
        ? { text: failure, tone: "danger" }
        : { text: "Plantilla eliminada.", tone: "success" },
    );
    void reload();
  }

  return (
    <>
      <PageHeader
        title="Plantillas de correo"
        description="Diseña plantillas de email de la subcuenta y gestiona los dominios de envío. Se usan como acción en las automatizaciones."
      >
        <Button
          disabled={!activeAgencyId}
          nativeButton={!activeAgencyId}
          render={
            activeAgencyId ? <Link to="/admin/templates/editor/new" /> : undefined
          }
        >
          <Plus data-icon="inline-start" aria-hidden="true" />
          Nueva plantilla
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
      {!activeAgencyId && (
        <Alert className="mb-4">
          <AlertDescription>
            Las plantillas y dominios son por subcuenta. Elige una agencia en el
            selector superior.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Dominios de envío</CardTitle>
              <CardDescription>
                Solo se puede enviar correo desde dominios verificados. (La
                verificación por DNS está simulada en esta entrega.)
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <form onSubmit={addDomain} className="flex flex-wrap gap-2">
                <Input
                  value={newDomain}
                  onChange={(event) => setNewDomain(event.target.value)}
                  placeholder="correo.tuempresa.com"
                  aria-label="Nuevo dominio"
                  className="max-w-xs"
                  disabled={!activeAgencyId}
                />
                <Button
                  type="submit"
                  variant="outline"
                  disabled={!activeAgencyId || domainSaving || !newDomain.trim()}
                >
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  Agregar dominio
                </Button>
              </form>
              {domains.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no hay dominios en esta subcuenta.
                </p>
              ) : (
                <ul className="grid gap-2">
                  {domains.map((domain) => (
                    <li
                      key={domain.id}
                      className="flex items-center gap-3 rounded-lg border px-3 py-2"
                    >
                      <Globe
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="font-mono text-sm">{domain.domain}</span>
                      <Badge
                        className={cn(
                          "ms-1",
                          domain.status === "VERIFIED"
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-amber-100 text-amber-900",
                        )}
                      >
                        {domain.status === "VERIFIED"
                          ? "Verificado"
                          : "Pendiente"}
                      </Badge>
                      <div className="ms-auto flex items-center gap-1">
                        {domain.status !== "VERIFIED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void verifyDomain(domain.id)}
                          >
                            <Check data-icon="inline-start" aria-hidden="true" />
                            Verificar
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Eliminar dominio ${domain.domain}`}
                          onClick={() => void removeDomain(domain.id)}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {templates.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={Mail}
                  title="Aún no hay plantillas"
                  hint="Crea plantillas reutilizables para enviarlas desde tus automatizaciones."
                  action={
                    <Button
                      variant="outline"
                      disabled={!activeAgencyId}
                      nativeButton={!activeAgencyId}
                      render={
                        activeAgencyId ? (
                          <Link to="/admin/templates/editor/new" />
                        ) : undefined
                      }
                    >
                      <Plus data-icon="inline-start" aria-hidden="true" />
                      Nueva plantilla
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {templates.map((template) => (
                <Card key={template.id} className="py-4">
                  <CardContent className="grid gap-2 px-5">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={`/admin/templates/editor/${template.id}`}
                        className="min-w-0 rounded-md outline-none focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <p className="flex items-center gap-2 font-medium">
                          <Mail
                            className="size-4 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                          {template.name}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {template.subject || "Sin asunto"}
                        </p>
                      </Link>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Editar ${template.name}`}
                          nativeButton={false}
                          render={
                            <Link to={`/admin/templates/editor/${template.id}`} />
                          }
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Eliminar ${template.name}`}
                          onClick={() => setToDelete(template)}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                    <p className="line-clamp-3 text-xs text-muted-foreground">
                      {htmlToText(template.body) || "Sin contenido"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <AlertDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará "{toDelete?.name}". Las automatizaciones que la usen
              deberán elegir otra.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void deleteTemplate()}
            >
              Eliminar plantilla
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
