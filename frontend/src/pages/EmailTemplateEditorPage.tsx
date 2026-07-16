import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, LayoutGrid, Sparkles, Type } from "lucide-react";
import { aiApi, emailTemplatesApi } from "@/api";
import { RichEmailEditor } from "@/components/email/RichEmailEditor";
import { BlockEmailBuilder } from "@/components/email/BlockEmailBuilder";
import { isBlockEmail } from "@/components/email/blockEmail";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveAgency } from "@/context/AgencyContext";
import { useMutationHandler, usePageData } from "@/hooks/usePageData";
import { AI_BUTTON_CLASS, cn } from "@/lib/utils";

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

function renderPreview(text: string): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, token: string) =>
    SAMPLE_VALUES[token] ?? `{{${token}}}`,
  );
}

export function EmailTemplateEditorPage() {
  const { templateId } = useParams();
  const isNew = !templateId || templateId === "new";
  const navigate = useNavigate();
  const { activeAgencyId } = useActiveAgency();
  const runMutation = useMutationHandler();

  const { data: template, isLoading, error } = usePageData(() =>
    isNew
      ? Promise.resolve(null)
      : emailTemplatesApi
          .list()
          .then((list) => list.find((item) => item.id === templateId) ?? null),
  );

  const [form, setForm] = useState({ name: "", subject: "", body: "" });
  const [bodyMode, setBodyMode] = useState<"rich" | "blocks">("blocks");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Hidrata el formulario una sola vez cuando llega la plantilla (edición).
  const [hydrated, setHydrated] = useState(isNew);
  if (!hydrated && template) {
    setHydrated(true);
    setForm({
      name: template.name,
      subject: template.subject,
      body: template.body,
    });
    setBodyMode(isBlockEmail(template.body) ? "blocks" : "rich");
  }

  // --- IA ---
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

  async function save() {
    if (isNew && !activeAgencyId) {
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
      if (isNew) {
        await emailTemplatesApi.create({
          name: form.name.trim(),
          subject: form.subject,
          body: form.body,
          agency_id: activeAgencyId!,
        });
      } else {
        await emailTemplatesApi.update(templateId!, {
          name: form.name.trim(),
          subject: form.subject,
          body: form.body,
        });
      }
    });
    setIsSaving(false);
    if (failure) {
      setFormError(failure);
      return;
    }
    navigate("/admin/templates");
  }

  const notFound = !isNew && !isLoading && !template;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* Encabezado */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Volver a plantillas"
            nativeButton={false}
            render={<Link to="/admin/templates" />}
          >
            <ArrowLeft aria-hidden="true" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">
              {isNew
                ? "Nueva plantilla"
                : form.name.trim() || "Editar plantilla"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Plantilla de correo · se usa como acción en las automatizaciones
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/admin/templates" />}
          >
            Cancelar
          </Button>
          <Button onClick={() => void save()} disabled={isSaving || notFound}>
            {isSaving ? "Guardando…" : isNew ? "Crear plantilla" : "Guardar"}
          </Button>
        </div>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      {isNew && !activeAgencyId && (
        <Alert>
          <AlertDescription>
            Las plantillas son por subcuenta. Elige una agencia en el selector
            superior antes de crear.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid flex-1 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="flex-1 rounded-xl" />
        </div>
      ) : notFound ? (
        <Alert variant="destructive">
          <AlertDescription>
            No se encontró la plantilla. Puede que se haya eliminado.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="mx-auto grid max-w-6xl gap-5">
            {/* IA */}
            <div className="grid gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
              <Label
                htmlFor="tpl-ai"
                className="flex items-center gap-1.5 text-primary"
              >
                <Sparkles className="size-4" aria-hidden="true" />
                Generar con IA
              </Label>
              <div className="flex flex-wrap gap-2">
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
                  className="min-w-60 flex-1"
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
              {aiError && <p className="text-xs text-destructive">{aiError}</p>}
            </div>

            {/* Nombre y asunto */}
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

            {/* Cuerpo */}
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
                            renderPreview(toBodyHtml(form.body)) ||
                            "Sin contenido",
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
