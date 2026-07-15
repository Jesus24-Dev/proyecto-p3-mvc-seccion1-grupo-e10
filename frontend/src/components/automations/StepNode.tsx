import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { STEP_META, type StepData } from "@/lib/automationSteps";
import { cn } from "@/lib/utils";

export type StepNode = Node<StepData, "step">;

/** Nodo del lienzo de automatizaciones: icono, tipo y resumen del paso. */
export function StepNodeComponent({ data, selected }: NodeProps<StepNode>) {
  const meta = STEP_META[data.kind];
  const Icon = meta.icon;
  const isTrigger = data.kind === "trigger";

  return (
    <div
      className={cn(
        "w-56 rounded-xl border bg-background p-3 shadow-sm transition-shadow",
        selected && "border-ring ring-3 ring-ring/30",
      )}
    >
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
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
      <Handle
        type="source"
        position={Position.Right}
        className="!size-2.5 !border-2 !border-background !bg-muted-foreground"
      />
    </div>
  );
}
