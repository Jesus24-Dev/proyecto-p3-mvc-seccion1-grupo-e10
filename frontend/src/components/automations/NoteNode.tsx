import { type Node, type NodeProps } from "@xyflow/react";
import { Copy, Pencil, StickyNote, Trash2 } from "lucide-react";
import { noteBodyClass } from "@/lib/automationSteps";
import { cn } from "@/lib/utils";

export type NoteNodeData = {
  text: string;
  color: string;
};

export type NoteNode = Node<NoteNodeData, "note">;

/**
 * Nota adhesiva flotante del lienzo: texto libre para anotar el flujo.
 * No participa en el árbol de pasos ni en las conexiones (sin handles).
 * Al seleccionarla muestra acciones (editar / duplicar / eliminar) que el
 * editor escucha por CustomEvent, igual que los pasos.
 */
export function NoteNodeComponent({ id, data, selected }: NodeProps<NoteNode>) {
  function requestAction(
    action: "edit" | "duplicate" | "delete",
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    event.stopPropagation();
    window.dispatchEvent(
      new CustomEvent(`automation:${action}-note`, { detail: { nodeId: id } }),
    );
  }

  return (
    <div
      className={cn(
        "relative w-56 rounded-md border px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm transition-shadow",
        noteBodyClass(data.color),
        selected && "ring-3 ring-ring/40",
      )}
    >
      {selected && (
        <div className="nodrag nopan absolute -top-3 right-2 flex items-center gap-0.5 rounded-full border bg-background px-1 py-0.5 text-foreground shadow-sm">
          <button
            type="button"
            className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Editar nota"
            onClick={(event) => requestAction("edit", event)}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Duplicar nota"
            onClick={(event) => requestAction("duplicate", event)}
          >
            <Copy className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label="Eliminar nota"
            onClick={(event) => requestAction("delete", event)}
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium opacity-70">
        <StickyNote className="size-3.5" aria-hidden="true" />
        Nota
      </div>
      {data.text.trim() ? (
        data.text
      ) : (
        <span className="opacity-50">Nota vacía…</span>
      )}
    </div>
  );
}
