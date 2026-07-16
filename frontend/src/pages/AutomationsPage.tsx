import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Folder,
  FolderInput,
  FolderPlus,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  Workflow,
  Zap,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutationHandler, usePageData } from "@/hooks/usePageData";
import { STEP_META, type StepData } from "@/lib/automationSteps";
import { cn } from "@/lib/utils";
import type { Automation } from "@/types";

const NO_FOLDER = "__sin_carpeta__";

// Carpetas creadas por el usuario (persisten aunque aún no tengan flujos).
const FOLDERS_STORAGE_KEY = "dr-logistics-automation-folders";

function loadCustomFolders(): string[] {
  try {
    const raw = window.localStorage.getItem(FOLDERS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function saveCustomFolders(folders: string[]): void {
  try {
    window.localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
  } catch {
    // El almacenamiento local puede no estar disponible.
  }
}

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
  const [customFolders, setCustomFolders] = useState<string[]>(
    loadCustomFolders,
  );
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderDraft, setFolderDraft] = useState("");

  const folderGroups = useMemo(() => {
    const groups = new Map<string, Automation[]>();

    // Siembra las carpetas creadas por el usuario (aunque estén vacías).
    for (const folder of customFolders) {
      groups.set(folder, []);
    }

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
  }, [automations, customFolders]);

  function createFolder(event: FormEvent) {
    event.preventDefault();
    const name = folderDraft.trim();
    if (!name) {
      return;
    }
    setCustomFolders((current) => {
      const next = current.includes(name) ? current : [...current, name];
      saveCustomFolders(next);
      return next;
    });
    setFolderDraft("");
    setFolderDialogOpen(false);
  }

  // Solo se pueden quitar carpetas propias que estén vacías (sin flujos).
  function removeEmptyFolder(name: string) {
    setCustomFolders((current) => {
      const next = current.filter((folder) => folder !== name);
      saveCustomFolders(next);
      return next;
    });
  }

  // Nombres de carpetas disponibles para el menú "Mover a carpeta".
  const folderNames = useMemo(
    () => folderGroups.map(([name]) => name).filter((name) => name.length > 0),
    [folderGroups],
  );

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

  // Mueve un flujo a otra carpeta ("" = Sin carpeta) actualizando su campo.
  async function moveAutomation(automation: Automation, folder: string) {
    if (folderOf(automation) === folder) {
      return;
    }
    setNotice(null);
    const failure = await runMutation(async () => {
      await automationsApi.update(automation.id, {
        name: automation.name,
        description: automation.description,
        folder,
        is_active: automation.is_active,
        definition: automation.definition,
      });
    });
    if (failure) {
      setNotice({ text: failure, tone: "danger" });
      return;
    }
    setNotice({
      text: folder
        ? `Movida a "${folder}".`
        : "Movida a Sin carpeta.",
      tone: "success",
    });
    void reload();
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) {
      return;
    }
    const automation = (automations ?? []).find(
      (item) => item.id === active.id,
    );
    if (!automation) {
      return;
    }
    // El id del destino es `folder:<nombre>` (vacío = Sin carpeta).
    const target = String(over.id).replace(/^folder:/, "");
    void moveAutomation(automation, target);
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
        <Button variant="outline" onClick={() => setFolderDialogOpen(true)}>
          <FolderPlus data-icon="inline-start" aria-hidden="true" />
          Nueva carpeta
        </Button>
        <Button
          nativeButton={false}
          render={<Link to="/admin/automations/editor/new" />}
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
      ) : (automations ?? []).length === 0 && customFolders.length === 0 ? (
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
                  render={<Link to="/admin/automations/editor/new" />}
                >
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  Nueva automatización
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="grid gap-6">
            {folderGroups.map(([folderName, group]) => (
              <FolderSection
                key={folderName || NO_FOLDER}
                folderName={folderName}
                canRemove={
                  Boolean(folderName) &&
                  group.length === 0 &&
                  customFolders.includes(folderName)
                }
                onRemove={() => removeEmptyFolder(folderName)}
              >
                {group.length === 0 ? (
                  <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                    Carpeta vacía. Arrastra un flujo aquí o usa "Nueva aquí".
                  </p>
                ) : (
                  <div className="grid gap-4">
                    {group.map((automation) => (
                      <AutomationRow
                        key={automation.id}
                        automation={automation}
                        folderNames={folderNames}
                        currentFolder={folderName}
                        onToggleActive={() => void handleToggleActive(automation)}
                        onEdit={() =>
                          navigate(`/admin/automations/editor/${automation.id}`)
                        }
                        onDelete={() => setAutomationToDelete(automation)}
                        onMove={(folder) => void moveAutomation(automation, folder)}
                      />
                    ))}
                  </div>
                )}
              </FolderSection>
            ))}
          </div>
        </DndContext>
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

      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={createFolder} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Nueva carpeta</DialogTitle>
              <DialogDescription>
                Agrupa tus automatizaciones. La carpeta aparece aunque aún no
                tenga flujos.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="folder-name">Nombre de la carpeta</Label>
              <Input
                id="folder-name"
                value={folderDraft}
                onChange={(event) => setFolderDraft(event.target.value)}
                placeholder="p. ej. Onboarding"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFolderDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={!folderDraft.trim()}>
                Crear carpeta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Sección de carpeta: zona donde se pueden soltar flujos (droppable).
function FolderSection({
  folderName,
  canRemove,
  onRemove,
  children,
}: {
  folderName: string;
  canRemove: boolean;
  onRemove: () => void;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `folder:${folderName}` });
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "-m-2 grid gap-3 rounded-xl p-2 transition-colors",
        isOver && "bg-primary/5 ring-2 ring-primary/30",
      )}
    >
      <div className="flex items-center gap-2">
        <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Folder className="size-4" aria-hidden="true" />
          {folderName || "Sin carpeta"}
        </h2>
        {folderName && (
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={
              <Link
                to={`/admin/automations/editor/new?folder=${encodeURIComponent(folderName)}`}
              />
            }
          >
            <Plus data-icon="inline-start" aria-hidden="true" />
            Nueva aquí
          </Button>
        )}
        {canRemove && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Eliminar carpeta ${folderName}`}
            onClick={onRemove}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        )}
      </div>
      {children}
    </section>
  );
}

// Fila de automatización: arrastrable por el asa + menú "Mover a carpeta".
function AutomationRow({
  automation,
  folderNames,
  currentFolder,
  onToggleActive,
  onEdit,
  onDelete,
  onMove,
}: {
  automation: Automation;
  folderNames: string[];
  currentFolder: string;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (folder: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: automation.id });
  // Otras carpetas a las que se puede mover (excluye la actual).
  const targets = folderNames.filter((name) => name !== currentFolder);

  return (
    <Card
      ref={setNodeRef}
      style={
        transform
          ? { transform: CSS.Translate.toString(transform), zIndex: 10 }
          : undefined
      }
      className={cn("py-4", isDragging && "opacity-70 shadow-lg")}
    >
      <CardContent className="flex flex-wrap items-center gap-4 px-5">
        <button
          type="button"
          className="flex cursor-grab items-center text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label={`Mover ${automation.name}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>
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
            onClick={onToggleActive}
          >
            {automation.is_active ? "Pausar" : "Activar"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Mover ${automation.name} a otra carpeta`}
                >
                  <FolderInput aria-hidden="true" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Mover a carpeta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {currentFolder && (
                <DropdownMenuItem onClick={() => onMove("")}>
                  Sin carpeta
                </DropdownMenuItem>
              )}
              {targets.length === 0 && !currentFolder ? (
                <DropdownMenuItem disabled>
                  No hay otras carpetas
                </DropdownMenuItem>
              ) : (
                targets.map((name) => (
                  <DropdownMenuItem key={name} onClick={() => onMove(name)}>
                    {name}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Editar ${automation.name}`}
            onClick={onEdit}
          >
            <Pencil aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Eliminar ${automation.name}`}
            onClick={onDelete}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
