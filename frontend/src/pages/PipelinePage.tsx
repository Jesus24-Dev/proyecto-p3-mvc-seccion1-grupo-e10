import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  Check,
  ExternalLink,
  ImageIcon,
  MapPin,
  MessageCircle,
  Search,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { contactsApi, packagesApi, pipelineStagesApi } from "@/api";
import { PageHeader } from "@/components/shared/PageHeader";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useMutationHandler, usePageData } from "@/hooks/usePageData";
import { nodeChipClass } from "@/lib/automationSteps";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Package, PipelineStage, UserInformation } from "@/types";

function contactLabel(
  contactById: Map<string, UserInformation>,
  contactId: string,
): string {
  const contact = contactById.get(contactId);
  return contact ? `${contact.first_name} ${contact.last_name}` : "Sin contacto";
}

export function PipelinePage() {
  const { data, isLoading, error, reload } = usePageData(() =>
    Promise.all([
      packagesApi.list(),
      pipelineStagesApi.list(),
      contactsApi.list(),
    ]),
  );
  const stages = data?.[1] ?? [];
  const contacts = data?.[2] ?? [];
  const runMutation = useMutationHandler();

  // Copia local de los paquetes para mover con optimistic UI.
  const [packages, setPackages] = useState<Package[] | null>(null);
  const rows = packages ?? data?.[0] ?? [];
  // Sincroniza la copia local cuando llegan datos nuevos.
  const loadedKey = (data?.[0] ?? []).map((p) => p.id).join(",");
  const [syncedKey, setSyncedKey] = useState("");
  if (data?.[0] && loadedKey !== syncedKey) {
    setPackages(data[0]);
    setSyncedKey(loadedKey);
  }

  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  // Detalle del paquete (al hacer click en una tarjeta).
  const [detail, setDetail] = useState<Package | null>(null);
  // Movimiento pendiente hacia la etapa terminal "Entregado" (a confirmar).
  const [pendingDelivery, setPendingDelivery] = useState<{
    packageId: string;
    targetStageId: string;
  } | null>(null);
  // Etapas ocultas del tablero (filtro por estado con checkboxes).
  const [hiddenStageIds, setHiddenStageIds] = useState<Set<string>>(
    () => new Set(),
  );

  const contactById = useMemo(
    () => new Map(contacts.map((c) => [c.id, c])),
    [contacts],
  );

  const activeStages = useMemo(
    () =>
      [...stages]
        .filter((s) => s.is_active)
        .sort((a, b) => a.position - b.position),
    [stages],
  );

  // Etapa de respaldo por status, para paquetes sin stage_id explícito.
  const stageByStatus = useMemo(() => {
    const map = new Map<string, string>();
    for (const stage of stages) {
      if (stage.status) map.set(stage.status, stage.id);
    }
    return map;
  }, [stages]);

  function stageIdOf(pkg: Package): string | null {
    return pkg.stage_id ?? stageByStatus.get(pkg.status) ?? null;
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const fromTs = from ? new Date(from).getTime() : null;
    const toTs = to ? new Date(to).getTime() + 24 * 60 * 60 * 1000 : null;
    return rows.filter((pkg) => {
      if (query) {
        const hay =
          pkg.tracking_code.toLowerCase().includes(query) ||
          pkg.description.toLowerCase().includes(query) ||
          contactLabel(contactById, pkg.contact_id).toLowerCase().includes(query);
        if (!hay) return false;
      }
      const created = new Date(pkg.created_at).getTime();
      if (fromTs !== null && created < fromTs) return false;
      if (toTs !== null && created >= toTs) return false;
      return true;
    });
  }, [rows, search, from, to, contactById]);

  const byStage = useMemo(() => {
    const map = new Map<string, Package[]>();
    for (const stage of activeStages) map.set(stage.id, []);
    for (const pkg of filtered) {
      const sid = stageIdOf(pkg);
      if (sid && map.has(sid)) {
        map.get(sid)!.push(pkg);
      }
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, activeStages, stageByStatus]);

  // Columnas visibles según el filtro de estados (checkboxes).
  const visibleStages = useMemo(
    () => activeStages.filter((s) => !hiddenStageIds.has(s.id)),
    [activeStages, hiddenStageIds],
  );

  function toggleStage(id: string) {
    setHiddenStageIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  // Mueve un paquete a una etapa (compartido por drag-and-drop y el selector
  // accesible por teclado del diálogo de detalle).
  async function movePackage(packageId: string, targetStageId: string) {
    const pkg = rows.find((p) => p.id === packageId);
    if (!pkg || stageIdOf(pkg) === targetStageId) return;

    // "Entregado" es terminal: confirmar antes de mover a esa etapa.
    const target = stages.find((s) => s.id === targetStageId);
    if (target?.status === "DELIVERED") {
      setPendingDelivery({ packageId, targetStageId });
      return;
    }
    await doMove(packageId, targetStageId);
  }

  async function doMove(packageId: string, targetStageId: string) {
    const pkg = rows.find((p) => p.id === packageId);
    if (!pkg) return;

    // Optimistic: mueve la tarjeta ya mismo.
    const prev = rows;
    setPackages((current) =>
      (current ?? prev).map((p) =>
        p.id === packageId ? { ...p, stage_id: targetStageId } : p,
      ),
    );
    setDetail((current) =>
      current && current.id === packageId
        ? { ...current, stage_id: targetStageId }
        : current,
    );
    const failure = await runMutation(async () => {
      const updated = await packagesApi.moveStage(packageId, targetStageId);
      // Aplica la respuesta real (status sincronizado, etc.).
      setPackages((current) =>
        (current ?? prev).map((p) => (p.id === packageId ? updated : p)),
      );
    });
    if (failure) {
      setPackages(prev); // revierte
      toast.error("No se pudo mover el paquete", { description: failure });
    } else {
      const stage = stages.find((s) => s.id === targetStageId);
      toast.success(`Movido a "${stage?.name ?? "etapa"}"`);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    await movePackage(String(active.id), String(over.id));
  }

  const activePackage = activeId
    ? rows.find((p) => p.id === activeId) ?? null
    : null;

  return (
    <>
      <PageHeader
        title="Pipeline"
        description="Arrastra los paquetes entre las etapas logísticas. Al mover a una etapa del sistema se actualiza su estado."
      >
        <Button variant="outline" render={<Link to="/admin/configuration" />}>
          Editar etapas
        </Button>
      </PageHeader>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative max-w-xs flex-1">
          <Search
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, descripción o contacto"
            aria-label="Buscar paquetes"
            className="pl-9"
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="pipe-from" className="text-xs text-muted-foreground">
            Desde
          </Label>
          <Input
            id="pipe-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 w-40"
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="pipe-to" className="text-xs text-muted-foreground">
            Hasta
          </Label>
          <Input
            id="pipe-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 w-40"
          />
        </div>
        {(search || from || to) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setFrom("");
              setTo("");
            }}
          >
            <X data-icon="inline-start" aria-hidden="true" />
            Limpiar
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {filtered.length} paquete{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Filtro por estado: muestra u oculta columnas del tablero. */}
      {activeStages.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-muted-foreground">Mostrar:</span>
          {activeStages.map((stage) => {
            const shown = !hiddenStageIds.has(stage.id);
            return (
              <button
                key={stage.id}
                type="button"
                role="checkbox"
                aria-checked={shown}
                onClick={() => toggleStage(stage.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  shown
                    ? "border-transparent " + nodeChipClass(stage.color)
                    : "border-dashed text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-3.5 items-center justify-center rounded-[4px] border",
                    shown ? "border-current" : "border-muted-foreground/40",
                  )}
                >
                  {shown && <Check className="size-2.5" aria-hidden="true" />}
                </span>
                {stage.name}
              </button>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-96 w-72 shrink-0 rounded-xl" />
          ))}
        </div>
      ) : activeStages.length === 0 ? (
        <Alert>
          <AlertDescription>
            No hay etapas activas. Crea o activa etapas en{" "}
            <Link to="/admin/configuration" className="underline">
              Configuración
            </Link>
            .
          </AlertDescription>
        </Alert>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex h-[calc(100svh-19rem)] min-h-80 gap-4 overflow-x-auto pb-3">
            {visibleStages.map((stage) => (
              <StageColumn
                key={stage.id}
                stage={stage}
                packages={byStage.get(stage.id) ?? []}
                contactById={contactById}
                activeId={activeId}
                onOpen={setDetail}
              />
            ))}
          </div>
          {/* Vista previa mínima: la tarjeta original queda atenuada. */}
          {activePackage && (
            <span className="sr-only">Moviendo {activePackage.tracking_code}</span>
          )}
        </DndContext>
      )}

      <PackageDetailDialog
        pkg={detail}
        onClose={() => setDetail(null)}
        contactById={contactById}
        stages={stages}
        activeStages={activeStages}
        onMove={movePackage}
        stageIdOf={stageIdOf}
      />

      {/* Confirmación de mover a la etapa terminal "Entregado". */}
      <AlertDialog
        open={Boolean(pendingDelivery)}
        onOpenChange={(open) => !open && setPendingDelivery(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Marcar como entregado?</AlertDialogTitle>
            <AlertDialogDescription>
              Entregado es el estado final del paquete: se dará por finalizado.
              ¿Seguro que quieres moverlo a esta etapa?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelivery) {
                  void doMove(
                    pendingDelivery.packageId,
                    pendingDelivery.targetStageId,
                  );
                }
                setPendingDelivery(null);
              }}
            >
              Sí, marcar entregado
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StageColumn({
  stage,
  packages,
  contactById,
  activeId,
  onOpen,
}: {
  stage: PipelineStage;
  packages: Package[];
  contactById: Map<string, UserInformation>;
  activeId: string | null;
  onOpen: (pkg: Package) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full w-72 shrink-0 flex-col rounded-xl border bg-muted/30 transition-colors",
        isOver && "border-primary/60 bg-primary/5",
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2.5">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
            nodeChipClass(stage.color),
          )}
        >
          {stage.name}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {packages.length}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
        {packages.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            Suelta paquetes aquí
          </p>
        ) : (
          packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              contactById={contactById}
              dragging={activeId === pkg.id}
              onOpen={onOpen}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PackageCard({
  pkg,
  contactById,
  dragging,
  onOpen,
}: {
  pkg: Package;
  contactById: Map<string, UserInformation>;
  dragging: boolean;
  onOpen: (pkg: Package) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: pkg.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(pkg)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(pkg);
        }
      }}
      className={cn(
        "cursor-grab touch-none rounded-lg border bg-background p-3 shadow-xs outline-none hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">
          {pkg.tracking_code}
        </span>
        {pkg.image_urls.length > 0 && (
          <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
            <ImageIcon className="size-3" aria-hidden="true" />
            {pkg.image_urls.length}
          </span>
        )}
      </div>
      <p className="mt-1 line-clamp-2 text-sm font-medium">{pkg.description}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {contactLabel(contactById, pkg.contact_id)}
      </p>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground tabular-nums">
        <span>{pkg.weight_kg} kg</span>
        <span>{formatDate(pkg.created_at)}</span>
      </div>
    </div>
  );
}

function PackageDetailDialog({
  pkg,
  onClose,
  contactById,
  stages,
  activeStages,
  onMove,
  stageIdOf,
}: {
  pkg: Package | null;
  onClose: () => void;
  contactById: Map<string, UserInformation>;
  stages: PipelineStage[];
  activeStages: PipelineStage[];
  onMove: (packageId: string, stageId: string) => void;
  stageIdOf: (pkg: Package) => string | null;
}) {
  const contact = pkg ? contactById.get(pkg.contact_id) : undefined;
  const stage = pkg
    ? stages.find((s) => s.id === pkg.stage_id) ??
      stages.find((s) => s.status === pkg.status)
    : undefined;
  const currentStageId = pkg ? stageIdOf(pkg) ?? "" : "";

  return (
    <Dialog open={Boolean(pkg)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {pkg && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                {stage && (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      nodeChipClass(stage.color),
                    )}
                  >
                    {stage.name}
                  </span>
                )}
                <span className="font-mono text-xs text-muted-foreground">
                  {pkg.tracking_code}
                </span>
              </div>
              <DialogTitle className="mt-1">{pkg.description}</DialogTitle>
              <DialogDescription>
                {contactLabel(contactById, pkg.contact_id)}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-1.5">
              <Label htmlFor="detail-stage">Etapa</Label>
              <Select
                items={activeStages.map((s) => ({ value: s.id, label: s.name }))}
                value={currentStageId}
                onValueChange={(value) => onMove(pkg.id, value as string)}
              >
                <SelectTrigger id="detail-stage" className="w-full">
                  <SelectValue placeholder="Selecciona una etapa" />
                </SelectTrigger>
                <SelectContent>
                  {activeStages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Peso</dt>
                <dd className="tabular-nums">{pkg.weight_kg} kg</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Dimensiones</dt>
                <dd>{pkg.dimensions || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Registrado</dt>
                <dd className="tabular-nums">{formatDate(pkg.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Fotos</dt>
                <dd className="tabular-nums">{pkg.image_urls.length}</dd>
              </div>
            </dl>

            {pkg.image_urls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pkg.image_urls.slice(0, 4).map((url, i) => (
                  <span
                    key={i}
                    className="size-16 overflow-hidden rounded-md border"
                  >
                    <img
                      src={url}
                      alt={`Foto ${i + 1}`}
                      className="size-full object-cover"
                    />
                  </span>
                ))}
              </div>
            )}

            <div className="grid gap-2">
              <Button
                variant="outline"
                className="justify-start"
                render={
                  <Link
                    to={`/admin/packages/${encodeURIComponent(pkg.tracking_code)}`}
                  />
                }
              >
                <MapPin data-icon="inline-start" aria-hidden="true" />
                Ver recorrido del paquete
                <ExternalLink className="ml-auto size-3.5" aria-hidden="true" />
              </Button>
              {contact && (
                <>
                  <Button
                    variant="outline"
                    className="justify-start"
                    render={<Link to={`/admin/contacts/${contact.id}`} />}
                  >
                    <User data-icon="inline-start" aria-hidden="true" />
                    Ver contacto
                    <ExternalLink className="ml-auto size-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    render={
                      <Link to={`/admin/conversations?contact=${contact.id}`} />
                    }
                  >
                    <MessageCircle data-icon="inline-start" aria-hidden="true" />
                    Ver conversación
                    <ExternalLink className="ml-auto size-3.5" aria-hidden="true" />
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
