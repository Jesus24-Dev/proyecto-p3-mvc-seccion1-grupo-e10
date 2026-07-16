import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { X } from "lucide-react";

/**
 * Arista con un botón para eliminar la conexión en su punto medio. El clic
 * emite un CustomEvent que el editor escucha para quitar la arista.
 */
export function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  function removeEdge(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("automation:delete-edge", { detail: { edgeId: id } }),
    );
  }

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <button
          type="button"
          onClick={removeEdge}
          aria-label="Eliminar conexión"
          className="nodrag nopan absolute flex size-5 items-center justify-center rounded-full border bg-background text-muted-foreground opacity-60 shadow-sm transition-colors hover:border-destructive hover:bg-destructive/10 hover:text-destructive hover:opacity-100"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
        >
          <X className="size-3" aria-hidden="true" />
        </button>
      </EdgeLabelRenderer>
    </>
  );
}
