import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import {
  CheckCircle2,
  Copy,
  GitBranch,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  Users,
} from "lucide-react";
import {
  STEP_META,
  branchesFor,
  nodeChipClass,
  stepWarning,
  type StepData,
} from "@/lib/automationSteps";
import { cn } from "@/lib/utils";

export type StepNode = Node<StepData, "step">;

/** Estado en vivo inyectado en `data.__live` al ejecutar la vista "En vivo". */
export type NodeLiveInfo = {
  active: number;
  ok: number;
  error: number;
  visited: number;
  lastError?: string;
};

/**
 * Nodo vertical del lienzo (estilo GHL): entra por arriba y sale por abajo.
 * Los pasos con ramas (condición / switch) muestran una etiqueta y un botón
 * "+" por cada salida; el resto, un solo "+" para encadenar el siguiente paso.
 * El "+" emite un CustomEvent que el editor escucha para insertar el paso.
 */
export function StepNodeComponent({ id, data, selected }: NodeProps<StepNode>) {
  const meta = STEP_META[data.kind];
  const Icon = meta.icon;
  const isTrigger = data.kind === "trigger";
  const branches = branchesFor(data);
  const isBranching = data.kind === "condition" || data.kind === "switch";
  const warning = stepWarning(data);
  // Modo "En vivo": el editor inyecta los agregados de ejecución y el nodo se
  // vuelve de solo lectura (sin toolbar ni botones "+").
  const live = (data as StepData & { __live?: NodeLiveInfo }).__live;
  // Estado del nodo en vivo: en curso (hay contactos), error, hecho
  // (ya pasaron y sin error) o pendiente (nadie ha pasado aún).
  const liveStatus: "running" | "error" | "done" | "pending" | null = !live
    ? null
    : live.active > 0
      ? "running"
      : live.error > 0
        ? "error"
        : live.ok > 0 || live.visited > 0
          ? "done"
          : "pending";

  function requestAdd(
    branchId: string,
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    // Evita que el clic burbujee al nodo (que lo seleccionaría y cancelaría
    // la inserción pendiente).
    event.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("automation:add-step", {
        detail: { nodeId: id, branchId },
      }),
    );
  }

  // Acciones sobre el nodo (editar/duplicar/eliminar): las escucha el editor.
  function requestAction(
    action: "edit" | "duplicate" | "delete",
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    event.stopPropagation();
    window.dispatchEvent(
      new CustomEvent(`automation:${action}-step`, {
        detail: { nodeId: id },
      }),
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "relative w-60 rounded-xl border bg-background p-3 shadow-sm transition-all",
          selected && "border-ring ring-3 ring-ring/30",
          // En vivo: el borde codifica el estado del nodo.
          liveStatus === "running" &&
            "border-primary ring-3 ring-primary/30 shadow-md",
          liveStatus === "done" && "border-success/60",
          liveStatus === "error" && "border-destructive/60",
          liveStatus === "pending" && "border-dashed opacity-55",
        )}
      >
        {liveStatus === "running" && (
          <span
            className="nodrag nopan absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground shadow-sm motion-safe:animate-pulse"
            title={`${live!.active} ${live!.active === 1 ? "contacto" : "contactos"} en este paso`}
          >
            <Users className="size-3" aria-hidden="true" />
            {live!.active}
          </span>
        )}
        {liveStatus === "done" && (
          <span
            className="nodrag nopan absolute -top-2.5 -right-2.5 flex size-6 items-center justify-center rounded-full bg-success text-success-foreground shadow-sm ring-2 ring-background"
            title={`Paso completado (${live!.ok})`}
          >
            <CheckCircle2 className="size-4" aria-hidden="true" />
          </span>
        )}
        {liveStatus === "error" && (
          <span
            className="nodrag nopan absolute -top-2.5 -right-2.5 flex size-6 items-center justify-center rounded-full bg-destructive text-white shadow-sm ring-2 ring-background"
            title={live!.lastError ?? `Con errores (${live!.error})`}
          >
            <TriangleAlert className="size-3.5" aria-hidden="true" />
          </span>
        )}

        {!isTrigger && (
          <Handle
            type="target"
            position={Position.Top}
            className="!size-4 !border-2 !border-background !bg-muted-foreground transition-colors hover:!bg-primary hover:!scale-110"
          />
        )}

        {selected && !live && (
          <div className="nodrag nopan absolute -top-3 right-2 flex items-center gap-0.5 rounded-full border bg-background px-1 py-0.5 shadow-sm">
            <button
              type="button"
              className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Editar paso"
              onClick={(event) => requestAction("edit", event)}
            >
              <Pencil className="size-3.5" aria-hidden="true" />
            </button>
            {!isTrigger && (
              <>
                <button
                  type="button"
                  className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Duplicar paso"
                  onClick={(event) => requestAction("duplicate", event)}
                >
                  <Copy className="size-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Eliminar paso"
                  onClick={(event) => requestAction("delete", event)}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        )}

        {warning && !live && (
          <span
            className="absolute -top-1.5 -right-1.5 size-3.5 rounded-full bg-amber-400 ring-2 ring-background"
            title={warning}
            role="img"
            aria-label={`Sin configurar: ${warning}`}
          />
        )}

        <div className="flex items-start gap-2.5">
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              isTrigger && !data.color
                ? "bg-primary text-primary-foreground"
                : nodeChipClass(data.color),
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {data.label?.trim() || meta.label}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {meta.summary(data)}
            </p>
          </div>
        </div>

        {/* En vivo: motivo del último fallo del nodo, legible en el lienzo. */}
        {liveStatus === "error" && live?.lastError && (
          <p
            className="mt-2 flex items-start gap-1 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive"
            title={live.lastError}
          >
            <TriangleAlert
              className="mt-0.5 size-3 shrink-0"
              aria-hidden="true"
            />
            <span className="line-clamp-2">{live.lastError}</span>
          </p>
        )}

        {!isBranching && (
          <Handle
            type="source"
            position={Position.Bottom}
            className="!size-4 !border-2 !border-background !bg-muted-foreground transition-colors hover:!bg-primary hover:!scale-110"
          />
        )}
      </div>

      {isBranching ? (
        <div className="mt-3 flex gap-3">
          {branches.map((branch) => (
            <div key={branch.id} className="flex flex-col items-center gap-1.5">
              <span className="flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1 text-xs font-medium shadow-sm">
                <GitBranch className="size-3 text-primary" aria-hidden="true" />
                <span className="max-w-28 truncate">{branch.label}</span>
              </span>
              <div className="relative">
                <Handle
                  id={branch.id}
                  type="source"
                  position={Position.Bottom}
                  className="!size-4 !border-2 !border-background !bg-muted-foreground transition-colors hover:!bg-primary hover:!scale-110"
                />
                {!live && (
                  <button
                    type="button"
                    className="nodrag flex size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
                    aria-label={`Agregar paso en la rama ${branch.label}`}
                    onClick={(event) => requestAdd(branch.id, event)}
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        !live && (
          <button
            type="button"
            className="nodrag mt-2 flex size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
            aria-label="Agregar paso siguiente"
            onClick={(event) => requestAdd("out", event)}
          >
            <Plus className="size-3.5" aria-hidden="true" />
          </button>
        )
      )}
    </div>
  );
}
