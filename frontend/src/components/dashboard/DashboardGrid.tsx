import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardWidgetLayout } from "@/types";

export type WidgetDescriptor = {
  id: string;
  title: string;
  content: ReactNode;
};

const ROW_UNIT = 120; // px por unidad de alto al redimensionar
const MAX_COLS = 12;

/** Media query reactiva: el grid editable solo aplica en escritorio. */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

type DashboardGridProps = {
  widgets: WidgetDescriptor[];
  layout: DashboardWidgetLayout[];
  editing: boolean;
  onLayoutChange: (next: DashboardWidgetLayout[]) => void;
};

export function DashboardGrid({
  widgets,
  layout,
  editing,
  onLayoutChange,
}: DashboardGridProps) {
  const isDesktop = useIsDesktop();
  const gridRef = useRef<HTMLDivElement>(null);
  const byId = new Map(widgets.map((widget) => [widget.id, widget]));

  const visible = layout
    .filter((entry) => !entry.hidden && byId.has(entry.id))
    .sort((a, b) => a.order - b.order);

  const sensors = useSensors(
    // Un pequeño umbral evita que un clic simple inicie un arrastre.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const ids = visible.map((entry) => entry.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) {
      return;
    }
    const reordered = arrayMove(visible, from, to);
    // Reescribe el campo order de los visibles según la nueva posición.
    const orderById = new Map(reordered.map((entry, index) => [entry.id, index]));
    onLayoutChange(
      layout.map((entry) =>
        orderById.has(entry.id)
          ? { ...entry, order: orderById.get(entry.id)! }
          : entry,
      ),
    );
  }

  function patch(id: string, changes: Partial<DashboardWidgetLayout>) {
    onLayoutChange(
      layout.map((entry) =>
        entry.id === id ? { ...entry, ...changes } : entry,
      ),
    );
  }

  // En móvil o fuera de edición sin escritorio: pila simple a una columna.
  if (!isDesktop) {
    return (
      <div className="grid grid-cols-1 gap-4">
        {visible.map((entry) => (
          <div key={entry.id}>{byId.get(entry.id)!.content}</div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={visible.map((entry) => entry.id)}
        strategy={rectSortingStrategy}
      >
        <div
          ref={gridRef}
          className="grid items-start gap-4"
          style={{
            gridTemplateColumns: `repeat(${MAX_COLS}, minmax(0, 1fr))`,
            gridAutoFlow: "row dense",
          }}
        >
          {visible.map((entry) => (
            <SortableWidget
              key={entry.id}
              entry={entry}
              title={byId.get(entry.id)!.title}
              editing={editing}
              gridRef={gridRef}
              onResize={(colSpan, rowSpan) => patch(entry.id, { colSpan, rowSpan })}
              onHide={() => patch(entry.id, { hidden: true })}
            >
              {byId.get(entry.id)!.content}
            </SortableWidget>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

type SortableWidgetProps = {
  entry: DashboardWidgetLayout;
  title: string;
  editing: boolean;
  gridRef: React.RefObject<HTMLDivElement | null>;
  onResize: (colSpan: number, rowSpan: number) => void;
  onHide: () => void;
  children: ReactNode;
};

function SortableWidget({
  entry,
  title,
  editing,
  gridRef,
  onResize,
  onHide,
  children,
}: SortableWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: entry.id, disabled: !editing });

  function startResize(event: ReactPointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    const grid = gridRef.current;
    if (!grid) return;
    const colUnit = grid.clientWidth / MAX_COLS;
    const startX = event.clientX;
    const startY = event.clientY;
    const startCol = entry.colSpan;
    const startRow = entry.rowSpan;

    function onMove(moveEvent: PointerEvent) {
      const deltaCols = Math.round((moveEvent.clientX - startX) / colUnit);
      const deltaRows = Math.round((moveEvent.clientY - startY) / ROW_UNIT);
      const colSpan = Math.min(MAX_COLS, Math.max(2, startCol + deltaCols));
      const rowSpan = Math.min(6, Math.max(1, startRow + deltaRows));
      onResize(colSpan, rowSpan);
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div
      ref={setNodeRef}
      className={cn("relative", isDragging && "z-10 opacity-80")}
      style={{
        gridColumn: `span ${entry.colSpan}`,
        minHeight: entry.rowSpan * ROW_UNIT,
        transform: CSS.Translate.toString(transform),
        transition,
      }}
    >
      {editing && (
        <>
          {/* Chrome de edición sobre el widget. */}
          <div className="absolute -top-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border bg-background px-1.5 py-0.5 shadow-sm">
            <button
              type="button"
              className="flex cursor-grab items-center text-muted-foreground hover:text-foreground active:cursor-grabbing"
              aria-label={`Mover ${title}`}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="size-4" aria-hidden="true" />
            </button>
            <span className="max-w-32 truncate text-xs font-medium">{title}</span>
            <button
              type="button"
              className="flex items-center text-muted-foreground hover:text-destructive"
              aria-label={`Ocultar ${title}`}
              onClick={onHide}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          {/* Marco discontinuo para indicar que es editable. */}
          <div
            className="pointer-events-none absolute inset-0 z-10 rounded-xl border-2 border-dashed border-primary/40"
            aria-hidden="true"
          />
          {/* Tirador de redimensionado (esquina inferior derecha). */}
          <div
            role="separator"
            aria-label={`Redimensionar ${title}`}
            onPointerDown={startResize}
            className="absolute -right-1 -bottom-1 z-20 size-4 cursor-nwse-resize rounded-sm border-2 border-primary/60 bg-background"
          />
        </>
      )}
      <div className={cn(editing && "pointer-events-none select-none")}>
        {children}
      </div>
    </div>
  );
}
