import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Plus } from "lucide-react";
import {
  STEP_META,
  branchesFor,
  type StepData,
} from "@/lib/automationSteps";
import { cn } from "@/lib/utils";

export type StepNode = Node<StepData, "step">;

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

  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "relative w-60 rounded-xl border bg-background p-3 shadow-sm transition-shadow",
          selected && "border-ring ring-3 ring-ring/30",
        )}
      >
        {!isTrigger && (
          <Handle
            type="target"
            position={Position.Top}
            className="!size-2.5 !border-2 !border-background !bg-muted-foreground"
          />
        )}
        <div className="flex items-start gap-2.5">
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              isTrigger
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">{meta.label}</p>
            <p className="truncate text-xs text-muted-foreground">
              {meta.summary(data)}
            </p>
          </div>
        </div>

        {!isBranching && (
          <Handle
            type="source"
            position={Position.Bottom}
            className="!size-2.5 !border-2 !border-background !bg-muted-foreground"
          />
        )}
      </div>

      {isBranching ? (
        <div className="mt-3 flex gap-3">
          {branches.map((branch) => (
            <div key={branch.id} className="flex flex-col items-center gap-1.5">
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {branch.label}
              </span>
              <div className="relative">
                <Handle
                  id={branch.id}
                  type="source"
                  position={Position.Bottom}
                  className="!size-2.5 !border-2 !border-background !bg-muted-foreground"
                />
                <button
                  type="button"
                  className="nodrag flex size-6 items-center justify-center rounded-full border border-dashed border-muted-foreground/50 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  aria-label={`Agregar paso en la rama ${branch.label}`}
                  onClick={(event) => requestAdd(branch.id, event)}
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <button
          type="button"
          className="nodrag mt-2 flex size-6 items-center justify-center rounded-full border border-dashed border-muted-foreground/50 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          aria-label="Agregar paso siguiente"
          onClick={(event) => requestAdd("out", event)}
        >
          <Plus className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
