import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Folder, Pencil, Plus, Trash2, Workflow, Zap } from "lucide-react";
import { automationsApi } from "@/api";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useMutationHandler, usePageData } from "@/hooks/usePageData";
import { STEP_META, type StepData } from "@/lib/automationSteps";
import type { Automation } from "@/types";

function folderOf(automation: Automation): string {
  return (automation.folder ?? "").trim();
}

function stepSummary(automation: Automation): string {
  const kinds = automation.definition.nodes
    .map((node) => (node.data as StepData | undefined)?.kind)
    .filter((kind): kind is StepData["kind"] => Boolean(kind))
    .map((kind) => STEP_META[kind].label);

  return kinds.length > 0 ? kinds.join(" → ") : "Flujo vacío";
}

export function AutomationsPage() {
  const navigate = useNavigate();
  const { data: automations, isLoading, error, reload } = usePageData(
    automationsApi.list,
  );
  const runMutation = useMutationHandler();

  const [automationToDelete, setAutomationToDelete] =
    useState<Automation | null>(null);
  const [notice, setNotice] = useState<{
    text: string;
    tone: "success" | "danger";
  } | null>(null);

  const folderGroups = useMemo(() => {
    const groups = new Map<string, Automation[]>();

    for (const automation of automations ?? []) {
      const key = folderOf(automation);
      const bucket = groups.get(key);
      if (bucket) {
        bucket.push(automation);
      } else {
        groups.set(key, [automation]);
      }
    }

    return Array.from(groups.entries()).sort(([first], [second]) => {
      if (!first) {
        return 1;
      }
      if (!second) {
        return -1;
      }
      return first.localeCompare(second, "es");
    });
  }, [automations]);

  async function handleToggleActive(automation: Automation) {
    setNotice(null);

    const payload = {
      name: automation.name,
      description: automation.description,
      folder: folderOf(automation),
      is_active: !automation.is_active,
      definition: automation.definition,
    };

    const failure = await runMutation(async () => {
      await automationsApi.update(automation.id, payload);
    });

    if (failure) {
      setNotice({ text: failure, tone: "danger" });
      return;
    }

    void reload();
  }

  async function handleDelete() {
    if (!automationToDelete) {
      return;
    }

    const failure = await runMutation(() =>
      automationsApi.remove(automationToDelete.id),
    );
    setAutomationToDelete(null);
    setNotice(
      failure
        ? { text: failure, tone: "danger" }
        : { text: "Automatización eliminada correctamente.", tone: "success" },
    );
    void reload();
  }

  return (
    <>
      <PageHeader
        title="Automatizaciones"
        description="Flujos que reaccionan a eventos de la red: esperas, mensajes de WhatsApp, correos y etiquetas."
      >
        <Button
          nativeButton={false}
          render={<Link to="/admin/automatizaciones/nueva" />}
        >
          <Plus data-icon="inline-start" aria-hidden="true" />
          Nueva automatización
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

      {isLoading ? (
        <div className="grid gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : (automations ?? []).length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Workflow}
              title="Aún no hay automatizaciones"
              hint="Crea tu primer flujo: elige un disparador y encadena esperas, mensajes y etiquetas."
              action={
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link to="/admin/automatizaciones/nueva" />}
                >
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  Nueva automatización
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {folderGroups.map(([folderName, group]) => (
            <section key={folderName || "__sin_carpeta__"} className="grid gap-3">
              <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Folder className="size-4" aria-hidden="true" />
                {folderName || "Sin carpeta"}
              </h2>
              <div className="grid gap-4">
                {group.map((automation) => (
                  <Card key={automation.id} className="py-4">
                    <CardContent className="flex flex-wrap items-center gap-4 px-5">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Zap className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{automation.name}</p>
                          <Badge
                            className={
                              automation.is_active
                                ? "bg-emerald-100 text-emerald-900"
                                : "bg-muted text-muted-foreground"
                            }
                          >
                            {automation.is_active ? "Activa" : "Pausada"}
                          </Badge>
                        </div>
                        <p className="truncate text-sm text-muted-foreground">
                          {stepSummary(automation)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleToggleActive(automation)}
                        >
                          {automation.is_active ? "Pausar" : "Activar"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Editar ${automation.name}`}
                          onClick={() =>
                            navigate(`/admin/automatizaciones/${automation.id}`)
                          }
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Eliminar ${automation.name}`}
                          onClick={() => setAutomationToDelete(automation)}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <AlertDialog
        open={Boolean(automationToDelete)}
        onOpenChange={(open) => !open && setAutomationToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta automatización?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará "{automationToDelete?.name}" y su flujo. Esta acción
              no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void handleDelete()}
            >
              Eliminar automatización
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
