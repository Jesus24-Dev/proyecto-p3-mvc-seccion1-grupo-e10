import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Braces,
  Code2,
  Columns2,
  Copy,
  GripVertical,
  Heading,
  Image as ImageIcon,
  Minus,
  MousePointerClick,
  Plus,
  Space,
  Trash2,
  Type,
} from "lucide-react";
import {
  AUTOMATION_VARIABLES,
  type AutomationVariable,
} from "@/lib/automationSteps";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DEFAULT_SETTINGS,
  FONT_OPTIONS,
  createBlock,
  parseEmail,
  renderBlockHtml,
  serializeEmail,
  type BlockAlign,
  type EmailBlock,
  type EmailBlockType,
  type EmailSettings,
} from "./blockEmail";

type BlockEmailBuilderProps = {
  value: string;
  onChange: (html: string) => void;
  variables?: AutomationVariable[];
};

const PALETTE: { type: EmailBlockType; label: string; icon: typeof Type }[] = [
  { type: "heading", label: "Título", icon: Heading },
  { type: "text", label: "Texto", icon: Type },
  { type: "image", label: "Imagen", icon: ImageIcon },
  { type: "button", label: "Botón", icon: MousePointerClick },
  { type: "columns", label: "Columnas", icon: Columns2 },
  { type: "divider", label: "Separador", icon: Minus },
  { type: "spacer", label: "Espacio", icon: Space },
  { type: "html", label: "HTML", icon: Code2 },
];

const ALIGN_OPTIONS: { value: BlockAlign; label: string; icon: typeof AlignLeft }[] = [
  { value: "left", label: "Izquierda", icon: AlignLeft },
  { value: "center", label: "Centro", icon: AlignCenter },
  { value: "right", label: "Derecha", icon: AlignRight },
];

export function BlockEmailBuilder({
  value,
  onChange,
  variables = AUTOMATION_VARIABLES,
}: BlockEmailBuilderProps) {
  // Estado inicial derivado del HTML recibido (parseo una sola vez).
  const [initial] = useState(() => parseEmail(value));
  const [blocks, setBlocks] = useState<EmailBlock[]>(initial.blocks);
  const [settings, setSettings] = useState<EmailSettings>(initial.settings);
  const [selectedId, setSelectedId] = useState<string | null>(
    initial.blocks[0]?.id ?? null,
  );

  // Reset derivado de props: si el valor cambia por fuera (p. ej. IA) y no
  // coincide con lo que nosotros serializamos, rehidratamos los bloques.
  // (Patrón en render con guarda, sin efectos ni refs.)
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (value !== serializeEmail({ blocks, settings })) {
      const parsed = parseEmail(value);
      setBlocks(parsed.blocks);
      setSettings(parsed.settings);
      setSelectedId(parsed.blocks[0]?.id ?? null);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function emit(nextBlocks: EmailBlock[], nextSettings: EmailSettings) {
    setBlocks(nextBlocks);
    setSettings(nextSettings);
    onChange(serializeEmail({ blocks: nextBlocks, settings: nextSettings }));
  }

  function addBlock(type: EmailBlockType) {
    const block = createBlock(type);
    emit([...blocks, block], settings);
    setSelectedId(block.id);
  }

  function updateBlock(id: string, patch: Partial<EmailBlock>) {
    emit(
      blocks.map((block) =>
        block.id === id ? ({ ...block, ...patch } as EmailBlock) : block,
      ),
      settings,
    );
  }

  function removeBlock(id: string) {
    const next = blocks.filter((block) => block.id !== id);
    emit(next, settings);
    if (selectedId === id) {
      setSelectedId(next[0]?.id ?? null);
    }
  }

  function duplicateBlock(id: string) {
    const index = blocks.findIndex((block) => block.id === id);
    if (index === -1) return;
    const clone = { ...blocks[index], id: createBlock("text").id } as EmailBlock;
    const next = [...blocks.slice(0, index + 1), clone, ...blocks.slice(index + 1)];
    emit(next, settings);
    setSelectedId(clone.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((block) => block.id === active.id);
    const newIndex = blocks.findIndex((block) => block.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    emit(arrayMove(blocks, oldIndex, newIndex), settings);
  }

  const selected = blocks.find((block) => block.id === selectedId) ?? null;

  return (
    <div className="grid gap-3 lg:grid-cols-[128px_1fr_248px]">
      {/* Paleta de bloques */}
      <div className="grid h-fit grid-cols-2 gap-1.5 rounded-lg border bg-muted/30 p-2 lg:grid-cols-1">
        <p className="col-span-2 px-1 text-xs font-medium text-muted-foreground lg:col-span-1">
          Bloques
        </p>
        {PALETTE.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => addBlock(item.type)}
            className="flex items-center gap-2 rounded-md border border-transparent bg-background px-2 py-1.5 text-left text-xs font-medium text-foreground shadow-xs transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <item.icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Lienzo */}
      <div
        className="min-h-[36rem] min-w-0 rounded-lg border p-3"
        style={{ background: settings.pageBg }}
      >
        {blocks.length === 0 ? (
          <div className="flex min-h-[32rem] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border/70 bg-background/60 text-center">
            <Plus className="size-5 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Agrega bloques desde la izquierda para construir el correo.
            </p>
          </div>
        ) : (
          <div
            className="mx-auto overflow-hidden rounded-lg"
            style={{
              maxWidth: settings.contentWidth,
              background: settings.contentBg,
              fontFamily: settings.fontFamily,
              color: settings.textColor,
            }}
          >
            <div className="p-5">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={blocks.map((block) => block.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {blocks.map((block) => (
                    <SortableBlock
                      key={block.id}
                      block={block}
                      settings={settings}
                      selected={block.id === selectedId}
                      onSelect={() => setSelectedId(block.id)}
                      onDuplicate={() => duplicateBlock(block.id)}
                      onRemove={() => removeBlock(block.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        )}
      </div>

      {/* Panel de ajustes */}
      <div className="grid h-fit min-w-0 content-start gap-4 rounded-lg border bg-card p-3">
        {selected ? (
          <BlockSettings
            block={selected}
            variables={variables}
            onChange={(patch) => updateBlock(selected.id, patch)}
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            Selecciona un bloque para editar sus propiedades.
          </p>
        )}

        <div className="grid gap-3 border-t pt-3">
          <p className="text-xs font-semibold text-foreground">Ajustes generales</p>
          <div className="grid gap-1.5">
            <Label className="text-xs" htmlFor="be-font">
              Tipografía
            </Label>
            <Select
              value={settings.fontFamily}
              onValueChange={(font) =>
                emit(blocks, { ...settings, fontFamily: font ?? settings.fontFamily })
              }
            >
              <SelectTrigger id="be-font" size="sm" className="w-full">
                <SelectValue>
                  {(value: string) =>
                    FONT_OPTIONS.find((font) => font.value === value)?.label ??
                    "Tipografía"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((font) => (
                  <SelectItem key={font.label} value={font.value}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs" htmlFor="be-width">
              Ancho del contenido (px)
            </Label>
            <Input
              id="be-width"
              type="number"
              min={320}
              max={800}
              value={settings.contentWidth}
              onChange={(event) =>
                emit(blocks, {
                  ...settings,
                  contentWidth: Number(event.target.value) || DEFAULT_SETTINGS.contentWidth,
                })
              }
            />
          </div>
          <ColorField
            label="Fondo de página"
            value={settings.pageBg}
            onChange={(color) => emit(blocks, { ...settings, pageBg: color })}
          />
          <ColorField
            label="Fondo del contenido"
            value={settings.contentBg}
            onChange={(color) => emit(blocks, { ...settings, contentBg: color })}
          />
          <ColorField
            label="Color de texto"
            value={settings.textColor}
            onChange={(color) => emit(blocks, { ...settings, textColor: color })}
          />
          <ColorField
            label="Color de botón"
            value={settings.buttonColor}
            onChange={(color) => emit(blocks, { ...settings, buttonColor: color })}
          />
          <ColorField
            label="Texto de botón"
            value={settings.buttonTextColor}
            onChange={(color) => emit(blocks, { ...settings, buttonTextColor: color })}
          />
        </div>
      </div>
    </div>
  );
}

function SortableBlock({
  block,
  settings,
  selected,
  onSelect,
  onDuplicate,
  onRemove,
}: {
  block: EmailBlock;
  settings: EmailSettings;
  selected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative rounded-md outline outline-transparent transition-[outline-color]",
        selected ? "outline-2 outline-primary" : "hover:outline-2 hover:outline-primary/30",
        isDragging && "z-10 opacity-70",
      )}
    >
      {/* Contenedor seleccionable: no puede ser <button> porque el HTML del
          bloque contiene contenido de flujo (títulos, tablas, enlaces). */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Seleccionar bloque"
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        }}
        className="block w-full cursor-pointer rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div
          className="pointer-events-none [&_a]:pointer-events-none"
          dangerouslySetInnerHTML={{ __html: renderBlockHtml(block, settings) }}
        />
      </div>

      {/* Controles flotantes */}
      <div
        className={cn(
          "absolute -top-2.5 right-1 flex items-center gap-0.5 rounded-md border bg-popover p-0.5 shadow-sm transition-opacity",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <button
          type="button"
          aria-label="Reordenar bloque"
          className="flex size-6 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Duplicar bloque"
          onClick={onDuplicate}
          className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted"
        >
          <Copy className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Eliminar bloque"
          onClick={onRemove}
          className="flex size-6 items-center justify-center rounded text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function BlockSettings({
  block,
  variables,
  onChange,
}: {
  block: EmailBlock;
  variables: AutomationVariable[];
  onChange: (patch: Partial<EmailBlock>) => void;
}) {
  const title = PALETTE.find((item) => item.type === block.type)?.label ?? "Bloque";

  return (
    <div className="grid gap-3">
      <p className="text-xs font-semibold text-foreground">Bloque: {title}</p>

      {block.type === "heading" && (
        <>
          <TextField
            label="Texto"
            value={block.text}
            variables={variables}
            onChange={(text) => onChange({ text })}
          />
          <div className="grid gap-1.5">
            <Label className="text-xs">Nivel</Label>
            <Select
              value={String(block.level)}
              onValueChange={(level) =>
                onChange({ level: Number(level) as 1 | 2 | 3 })
              }
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Título grande</SelectItem>
                <SelectItem value="2">Subtítulo</SelectItem>
                <SelectItem value="3">Título pequeño</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlignField value={block.align} onChange={(align) => onChange({ align })} />
        </>
      )}

      {block.type === "text" && (
        <>
          <TextField
            label="Contenido"
            value={block.text}
            variables={variables}
            multiline
            onChange={(text) => onChange({ text })}
          />
          <AlignField value={block.align} onChange={(align) => onChange({ align })} />
        </>
      )}

      {block.type === "image" && (
        <>
          <div className="grid gap-1.5">
            <Label className="text-xs" htmlFor="be-img-src">
              URL de la imagen
            </Label>
            <Input
              id="be-img-src"
              value={block.src}
              placeholder="https://…"
              onChange={(event) => onChange({ src: event.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs" htmlFor="be-img-alt">
              Texto alternativo
            </Label>
            <Input
              id="be-img-alt"
              value={block.alt}
              onChange={(event) => onChange({ alt: event.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs" htmlFor="be-img-href">
              Enlace (opcional)
            </Label>
            <Input
              id="be-img-href"
              value={block.href}
              placeholder="https://…"
              onChange={(event) => onChange({ href: event.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs" htmlFor="be-img-width">
              Ancho ({block.width}%)
            </Label>
            <input
              id="be-img-width"
              type="range"
              min={20}
              max={100}
              step={5}
              value={block.width}
              onChange={(event) => onChange({ width: Number(event.target.value) })}
              className="accent-primary"
            />
          </div>
          <AlignField value={block.align} onChange={(align) => onChange({ align })} />
        </>
      )}

      {block.type === "button" && (
        <>
          <TextField
            label="Texto del botón"
            value={block.label}
            variables={variables}
            onChange={(label) => onChange({ label })}
          />
          <div className="grid gap-1.5">
            <Label className="text-xs" htmlFor="be-btn-href">
              Enlace
            </Label>
            <Input
              id="be-btn-href"
              value={block.href}
              placeholder="https://…"
              onChange={(event) => onChange({ href: event.target.value })}
            />
          </div>
          <AlignField value={block.align} onChange={(align) => onChange({ align })} />
        </>
      )}

      {block.type === "spacer" && (
        <div className="grid gap-1.5">
          <Label className="text-xs">Altura</Label>
          <Select
            value={block.size}
            onValueChange={(size) =>
              onChange({ size: size as "sm" | "md" | "lg" })
            }
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Pequeño</SelectItem>
              <SelectItem value="md">Mediano</SelectItem>
              <SelectItem value="lg">Grande</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {block.type === "columns" && (
        <>
          <TextField
            label="Columna izquierda"
            value={block.left}
            variables={variables}
            multiline
            onChange={(left) => onChange({ left })}
          />
          <TextField
            label="Columna derecha"
            value={block.right}
            variables={variables}
            multiline
            onChange={(right) => onChange({ right })}
          />
        </>
      )}

      {block.type === "html" && (
        <div className="grid gap-1.5">
          <Label className="text-xs" htmlFor="be-html">
            HTML personalizado
          </Label>
          <textarea
            id="be-html"
            value={block.code}
            rows={6}
            onChange={(event) => onChange({ code: event.target.value })}
            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
      )}

      {block.type === "divider" && (
        <p className="text-xs text-muted-foreground">
          Una línea separadora horizontal. No tiene opciones.
        </p>
      )}
    </div>
  );
}

function TextField({
  label,
  value,
  variables,
  multiline,
  onChange,
}: {
  label: string;
  value: string;
  variables: AutomationVariable[];
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  const [varOpen, setVarOpen] = useState(false);

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setVarOpen((open) => !open)}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
          >
            <Braces className="size-3" aria-hidden="true" />
            Variable
          </button>
          {varOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setVarOpen(false)}
                aria-hidden="true"
              />
              <ul className="absolute right-0 z-20 mt-1 max-h-52 w-56 overflow-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
                {variables.map((variable) => (
                  <li key={variable.token}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(`${value}{{${variable.token}}}`);
                        setVarOpen(false);
                      }}
                      className="flex w-full flex-col rounded-md px-2 py-1.5 text-left hover:bg-muted"
                    >
                      <span className="text-xs font-medium">{`{{${variable.token}}}`}</span>
                      {variable.description && (
                        <span className="text-xs text-muted-foreground">
                          {variable.description}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
      {multiline ? (
        <textarea
          value={value}
          rows={4}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      ) : (
        <Input value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </div>
  );
}

function AlignField({
  value,
  onChange,
}: {
  value: BlockAlign;
  onChange: (value: BlockAlign) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">Alineación</Label>
      <div className="flex gap-1">
        {ALIGN_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-8 flex-1 items-center justify-center rounded-md border transition-colors",
              value === option.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-input text-muted-foreground hover:bg-muted",
            )}
          >
            <option.icon className="size-4" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-xs">{label}</Label>
      <span className="flex items-center gap-1.5">
        <span className="font-mono text-xs text-muted-foreground">{value}</span>
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
          className="size-7 cursor-pointer rounded border border-input bg-transparent"
        />
      </span>
    </div>
  );
}
