import { type Node, type NodeProps } from "@xyflow/react";
import { StickyNote } from "lucide-react";
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
 */
export function NoteNodeComponent({ data, selected }: NodeProps<NoteNode>) {
  return (
    <div
      className={cn(
        "w-56 rounded-md border px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm transition-shadow",
        noteBodyClass(data.color),
        selected && "ring-3 ring-ring/40",
      )}
    >
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
