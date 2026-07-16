import { useMemo, useState, type FormEvent } from "react";
import {
  Check,
  Globe,
  LayoutGrid,
  Mail,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Type,
} from "lucide-react";
import { aiApi, emailDomainsApi, emailTemplatesApi } from "@/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { RichEmailEditor } from "@/components/email/RichEmailEditor";
import { BlockEmailBuilder } from "@/components/email/BlockEmailBuilder";
import { isBlockEmail } from "@/components/email/blockEmail";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveAgency } from "@/context/AgencyContext";
import { useMutationHandler, usePageData } from "@/hooks/usePageData";
import { AI_BUTTON_CLASS, cn } from "@/lib/utils";
import type { EmailTemplate } from "@/types";

// Valores de ejemplo para previsualizar las variables del correo.
const SAMPLE_VALUES: Record<string, string> = {
  nombre: "María",
  apellido: "Cliente",
  email: "maria@correo.com",
  telefono: "+58 412 555 1234",
  agencia: "Caracas Central",
  tracking: "DRL-2026-9F3A21B0",
  paquete: "Caja mediana con repuestos",
  estado_paquete: "En tránsito",
  estado_envio: "Procesando",
};

/** Envuelve texto plano heredado en HTML para previsualizar/renderizar. */
function toBodyHtml(value: string): string {
  if (!value || value.includes("<")) {
    return value;
  }
  return value
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Convierte HTML a texto plano para vistas compactas (tarjetas). */
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|h1|h2|h3|li|blockquote)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function renderPreview(text: string): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, token: string) =>
    SAMPLE_VALUES[token] ?? `{{${token}}}`,
  );
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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState({ name: "", subject: "", body: "" });
  const [bodyMode, setBodyMode] = useState<"rich" | "blocks">("blocks");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toDelete, setToDelete] = useState<EmailTemplate | null>(null);

  // Generación con IA del contenido de la plantilla.
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function generateWithAi() {
    if (!aiPrompt.trim()) {
      return;
    }
    setAiLoading(true);
    setAiError(null);
    const failure = await runMutation(async () => {
      const result = await aiApi.email(aiPrompt.trim());
      setForm((current) => ({
        ...current,
        subject: result.subject || current.subject,
        body: result.body || current.body,
      }));
    });
    setAiLoading(false);
    if (failure) {
      setAiError(failure);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: "", subject: "", body: "" });
    setBodyMode("blocks");
    setFormError(null);
    setIsFormOpen(true);
  }

  function openEdit(template: EmailTemplate) {
    setEditing(template);
    setForm({
      name: template.name,
      subject: template.subject,
      body: template.body,
    });
    setBodyMode(isBlockEmail(template.body) ? "blocks" : "rich");
    setFormError(null);
    setIsFormOpen(true);
  }

  async function saveTemplate(event: FormEvent) {
    event.preventDefault();
    if (!editing && !activeAgencyId) {
      setFormError("Elige una subcuenta activa para crear plantillas.");
      return;
    }
    if (!form.name.trim()) {
      setFormError("Dale un nombre a la plantilla.");
      return;
    }
    setIsSaving(true);
    setFormError(null);
    const failure = await runMutation(async () => {
      if (editing) {
        await emailTemplatesApi.update(editing.id, {
          name: form.name.trim(),
          subject: form.subject,
          body: form.body,
        });
      } else {
        await emailTemplatesApi.create({
          name: form.name.trim(),
          subject: form.subject,
          body: form.body,
          agency_id: activeAgencyId!,
        });
      }
    });
    setIsSaving(false);
    if (failure) {
      setFormError(failure);
      return;
    }
    setIsFormOpen(false);
    setNotice({
      text: editing ? "Plantilla actualizada." : "Plantilla creada.",
      tone: "success",
    });
    void reload();
  }

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
        <Button onClick={openCreate} disabled={!activeAgencyId}>
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
                      onClick={openCreate}
                      disabled={!activeAgencyId}
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
                      <div className="min-w-0">
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
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Editar ${template.name}`}
                          onClick={() => openEdit(template)}
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

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent
          className={cn(
            "sm:max-w-2xl",
            bodyMode === "blocks" && "sm:max-w-5xl",
          )}
        >
          <form
            onSubmit={saveTemplate}
            className="grid max-h-[85vh] gap-4 overflow-y-auto pr-1"
          >
            <DialogHeader>
              <DialogTitle>
                {editing ? "Editar plantilla" : "Nueva plantilla"}
              </DialogTitle>
              <DialogDescription>
                Usa variables como{" "}
                <code className="rounded bg-primary/15 px-1 font-medium text-primary">
                  {"{{nombre}}"}
                </code>
                ; a la derecha ves una previsualización con datos de ejemplo.
              </DialogDescription>
            </DialogHeader>
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
              <Label
                htmlFor="tpl-ai"
                className="flex items-center gap-1.5 text-primary"
              >
                <Sparkles className="size-4" aria-hidden="true" />
                Generar con IA
              </Label>
              <div className="flex gap-2">
                <Input
                  id="tpl-ai"
                  value={aiPrompt}
                  onChange={(event) => setAiPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void generateWithAi();
                    }
                  }}
                  placeholder="Describe el correo, p. ej. 'bienvenida cálida para nuevos clientes'"
                />
                <Button
                  type="button"
                  className={AI_BUTTON_CLASS}
                  onClick={() => void generateWithAi()}
                  disabled={aiLoading || !aiPrompt.trim()}
                >
                  <Sparkles data-icon="inline-start" aria-hidden="true" />
                  {aiLoading ? "Generando…" : "Generar"}
                </Button>
              </div>
              {aiError && (
                <p className="text-xs text-destructive">{aiError}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="tpl-name">Nombre</Label>
                <Input
                  id="tpl-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((c) => ({ ...c, name: event.target.value }))
                  }
                  placeholder="p. ej. Bienvenida"
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tpl-subject">Asunto</Label>
                <Input
                  id="tpl-subject"
                  value={form.subject}
                  onChange={(event) =>
                    setForm((c) => ({ ...c, subject: event.target.value }))
                  }
                  placeholder="¡Hola {{nombre}}!"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Cuerpo</Label>
                <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
                  <button
                    type="button"
                    aria-pressed={bodyMode === "blocks"}
                    onClick={() => setBodyMode("blocks")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      bodyMode === "blocks"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <LayoutGrid className="size-3.5" aria-hidden="true" />
                    Bloques
                  </button>
                  <button
                    type="button"
                    aria-pressed={bodyMode === "rich"}
                    onClick={() => setBodyMode("rich")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      bodyMode === "rich"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Type className="size-3.5" aria-hidden="true" />
                    Texto enriquecido
                  </button>
                </div>
              </div>

              {bodyMode === "blocks" ? (
                <BlockEmailBuilder
                  value={form.body}
                  onChange={(html) => setForm((c) => ({ ...c, body: html }))}
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <RichEmailEditor
                    value={form.body}
                    onChange={(html) => setForm((c) => ({ ...c, body: html }))}
                    placeholder="Hola {{nombre}}, …"
                  />
                  <div className="grid gap-2">
                    <Label>Previsualización</Label>
                    <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
                      <p className="font-medium">
                        {renderPreview(form.subject) || "Sin asunto"}
                      </p>
                      <div
                        className={cn(
                          "border-t pt-2 text-muted-foreground",
                          "[&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-foreground",
                          "[&_h2]:mb-1.5 [&_h2]:text-lg [&_h2]:font-medium [&_h2]:text-foreground",
                          "[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
                          "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
                          "[&_a]:font-medium [&_a]:text-primary [&_a]:underline",
                          "[&_blockquote]:border-l [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic",
                          "[&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-md",
                        )}
                        dangerouslySetInnerHTML={{
                          __html:
                            renderPreview(toBodyHtml(form.body)) || "Sin contenido",
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
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
                {isSaving ? "Guardando…" : editing ? "Guardar" : "Crear"}
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
