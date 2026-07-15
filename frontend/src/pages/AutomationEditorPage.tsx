import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, Play, Plus, Save, Search, Trash2, X } from "lucide-react";
import { ApiRequestError, automationsApi } from "@/api";
import { useAuth } from "@/context/AuthContext";
import { useMutationHandler } from "@/hooks/usePageData";
import {
  BRANCH_FIELDS,
  CONDITION_OPERATORS,
  STEP_META,
  TRIGGER_OPTIONS,
  WAIT_UNITS,
  branchesFor,
  defaultDataFor,
  type StepData,
  type StepKind,
} from "@/lib/automationSteps";
import { layoutTree } from "@/lib/automationLayout";
import { StepNodeComponent, type StepNode } from "@/components/automations/StepNode";
import { VariableTextarea } from "@/components/automations/VariableTextarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import type { AutomationDefinition } from "@/types";

const nodeTypes = { step: StepNodeComponent };

const WEBHOOK_METHODS = [
  { value: "POST", label: "POST" },
  { value: "GET", label: "GET" },
] as const;

// Catálogo de acciones del panel derecho, agrupado como en un builder real.
const ACTION_CATALOG: Array<{ group: string; kinds: StepKind[] }> = [
  { group: "Mensajería", kinds: ["send_whatsapp", "send_email"] },
  { group: "Contacto", kinds: ["add_tag"] },
  { group: "Lógica", kinds: ["wait", "condition", "switch"] },
  { group: "Integraciones", kinds: ["send_webhook"] },
];

type Step = { id: string; data: StepData };
type Insertion = { nodeId: string; branchId: string };

const initialSteps: Step[] = [{ id: "trigger", data: defaultDataFor("trigger") }];

function newId(): string {
  return `n${Date.now().toString(36)}${Math.floor(performance.now())
    .toString(36)
    .slice(-3)}`;
}

export function AutomationEditorPage() {
  const { automationId } = useParams();
  const isNew = !automationId || automationId === "nueva";
  const navigate = useNavigate();
  const { expireSession } = useAuth();
  const runMutation = useMutationHandler();

  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [name, setName] = useState("Nueva automatización");
  const [folder, setFolder] = useState("");
  const [folderOptions, setFolderOptions] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [notice, setNotice] = useState<{
    text: string;
    tone: "success" | "danger";
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<Insertion | null>(null);
  const [actionQuery, setActionQuery] = useState("");

  // Aristas válidas: descarta las que apuntan a ramas ya inexistentes
  // (p. ej. un caso de switch eliminado) o a nodos borrados.
  const validEdges = useMemo(() => {
    const stepById = new Map(steps.map((step) => [step.id, step]));
    return edges.filter((edge) => {
      const source = stepById.get(edge.source);
      if (!source || !stepById.has(edge.target)) {
        return false;
      }
      const branchIds = branchesFor(source.data).map((branch) => branch.id);
      return !edge.sourceHandle || branchIds.includes(edge.sourceHandle);
    });
  }, [steps, edges]);

  const flowNodes = useMemo(
    () =>
      layoutTree(steps, validEdges).map((node) => ({
        ...node,
        selected: node.id === selectedId,
      })),
    [steps, validEdges, selectedId],
  );

  const flowEdges = useMemo(
    () =>
      validEdges.map((edge) => ({
        ...edge,
        markerEnd: { type: MarkerType.ArrowClosed },
      })),
    [validEdges],
  );

  const selectedStep = useMemo(
    () => steps.find((step) => step.id === selectedId) ?? null,
    [steps, selectedId],
  );

  useEffect(() => {
    // Sugerencias de carpeta a partir de las automatizaciones existentes.
    automationsApi
      .list()
      .then((list) => {
        const folders = [
          ...new Set(list.map((item) => item.folder).filter(Boolean)),
        ];
        setFolderOptions(folders);
      })
      .catch(() => setFolderOptions([]));
  }, []);

  useEffect(() => {
    if (isNew) {
      return;
    }
    let cancelled = false;

    automationsApi
      .get(automationId!)
      .then((automation) => {
        if (cancelled) {
          return;
        }
        setName(automation.name);
        setFolder(automation.folder ?? "");
        setIsActive(automation.is_active);
        setSteps(
          (automation.definition.nodes as unknown as StepNode[]).map(
            (node) => ({ id: node.id, data: node.data }),
          ),
        );
        setEdges(automation.definition.edges as unknown as Edge[]);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        if (
          error instanceof ApiRequestError &&
          (error.statusCode === 401 || error.statusCode === 403)
        ) {
          expireSession(error.message);
          return;
        }
        setNotice({
          text:
            error instanceof Error
              ? error.message
              : "No se pudo cargar la automatización.",
          tone: "danger",
        });
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [automationId, isNew, expireSession]);

  // El "+" de cada nodo/rama pide insertar un paso: guarda el objetivo y
  // deja el panel derecho en modo catálogo.
  useEffect(() => {
    function onAddStep(event: Event) {
      const detail = (event as CustomEvent<Insertion>).detail;
      setPending(detail);
      setSelectedId(null);
    }
    window.addEventListener("automation:add-step", onAddStep);
    return () => window.removeEventListener("automation:add-step", onAddStep);
  }, []);

  function updateSelected(patch: Partial<StepData>) {
    if (!selectedId) {
      return;
    }
    setSteps((current) =>
      current.map((step) =>
        step.id === selectedId
          ? { ...step, data: { ...step.data, ...patch } }
          : step,
      ),
    );
  }

  /** Inserta un paso conectado al objetivo pendiente (o al final del flujo). */
  function addStep(kind: StepKind) {
    const target =
      pending ??
      (() => {
        // Sin objetivo explícito: engancha al primer nodo sin salida.
        const withOutgoing = new Set(validEdges.map((edge) => edge.source));
        const leaf =
          [...steps].reverse().find((step) => !withOutgoing.has(step.id)) ??
          steps[steps.length - 1];
        const branch = branchesFor(leaf.data)[0];
        return { nodeId: leaf.id, branchId: branch.id };
      })();

    const id = newId();
    const newData = defaultDataFor(kind);
    // Handle de paso del nuevo nodo (para insertar "entre" dos pasos).
    const passHandle = branchesFor(newData)[0].id;
    const sourceHandle =
      target.branchId === "out" ? undefined : target.branchId;

    setSteps((current) => [...current, { id, data: newData }]);
    setEdges((current) => {
      // ¿La salida elegida ya alimentaba un hijo? Entonces insertamos en medio:
      // origen → nuevo → hijo previo.
      const existing = current.find(
        (edge) =>
          edge.source === target.nodeId &&
          (edge.sourceHandle ?? "out") === target.branchId,
      );

      const rest = current.filter((edge) => edge !== existing);
      const inserted: Edge[] = [
        { id: `e${id}`, source: target.nodeId, target: id, sourceHandle },
      ];

      if (existing) {
        inserted.push({
          id: `e${id}-c`,
          source: id,
          target: existing.target,
          sourceHandle: passHandle === "out" ? undefined : passHandle,
        });
      }

      return [...rest, ...inserted];
    });
    setPending(null);
    setSelectedId(id);
  }

  function removeSelected() {
    if (!selectedStep || selectedStep.data.kind === "trigger") {
      return;
    }
    setSteps((current) => current.filter((step) => step.id !== selectedId));
    setEdges((current) =>
      current.filter(
        (edge) => edge.source !== selectedId && edge.target !== selectedId,
      ),
    );
    setSelectedId(null);
  }

  function updateSwitchCase(index: number, value: string) {
    const cases = [...(selectedStep?.data.cases ?? [])];
    cases[index] = value;
    updateSelected({ cases });
  }

  async function handleSave() {
    setIsSaving(true);
    setNotice(null);

    const definition: AutomationDefinition = {
      nodes: steps.map((step) => ({
        id: step.id,
        type: "step",
        position: { x: 0, y: 0 },
        data: step.data,
      })) as unknown as AutomationDefinition["nodes"],
      edges: validEdges as unknown as AutomationDefinition["edges"],
    };

    const failure = await runMutation(async () => {
      const payload = {
        name,
        folder: folder.trim() || undefined,
        is_active: isActive,
        definition,
      };
      if (isNew) {
        const created = await automationsApi.create(payload);
        navigate(`/admin/automatizaciones/${created.id}`, { replace: true });
      } else {
        await automationsApi.update(automationId!, payload);
      }
    });

    setIsSaving(false);
    setNotice(
      failure
        ? { text: failure, tone: "danger" }
        : { text: "Automatización guardada correctamente.", tone: "success" },
    );
  }

  const runTest = useCallback(async () => {
    if (isNew) {
      return;
    }
    setIsTesting(true);
    setNotice(null);
    try {
      const result = (await automationsApi.triggerWebhook(automationId!)) as {
        status?: string;
      };
      setNotice({
        text: `Disparador ejecutado: ${result.status ?? "queued"}.`,
        tone: "success",
      });
    } catch (error) {
      setNotice({
        text:
          error instanceof Error
            ? error.message
            : "No se pudo disparar la automatización.",
        tone: "danger",
      });
    } finally {
      setIsTesting(false);
    }
  }, [automationId, isNew]);

  if (isLoading) {
    return <Skeleton className="h-[70vh] rounded-xl" />;
  }

  const showCatalog = Boolean(pending) || !selectedStep;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          aria-label="Volver a automatizaciones"
          render={<Link to="/admin/automatizaciones" />}
        >
          <ArrowLeft aria-hidden="true" />
        </Button>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="Nombre de la automatización"
          className="h-9 max-w-xs font-medium"
        />
        <Input
          value={folder}
          onChange={(event) => setFolder(event.target.value)}
          list="automation-folders"
          placeholder="Carpeta (escribe o elige)"
          aria-label="Carpeta"
          className="h-9 max-w-44"
        />
        <datalist id="automation-folders">
          {folderOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsActive((current) => !current)}
        >
          {isActive ? "Activa" : "Pausada"}
        </Button>
        <div className="ms-auto flex items-center gap-2">
          {!isNew && (
            <Button
              variant="outline"
              onClick={() => void runTest()}
              disabled={isTesting}
            >
              <Play data-icon="inline-start" aria-hidden="true" />
              {isTesting ? "Disparando…" : "Probar disparador"}
            </Button>
          )}
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            <Save data-icon="inline-start" aria-hidden="true" />
            {isSaving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>

      {notice && (
        <Alert variant={notice.tone === "danger" ? "destructive" : "default"}>
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid min-h-0 flex-1 items-stretch gap-4 lg:grid-cols-[1fr_20rem]">
        <Card className="min-h-0 overflow-hidden p-0">
          <div className="h-full min-h-[460px]">
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              nodesDraggable={false}
              nodesConnectable={false}
              onNodeClick={(_, node) => {
                setSelectedId(node.id);
                setPending(null);
              }}
              onPaneClick={() => {
                setSelectedId(null);
                setPending(null);
              }}
              fitView
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={24} />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
        </Card>

        <Card className="h-fit">
          <CardContent className="grid gap-4">
            {showCatalog ? (
              <>
                <div>
                  <p className="font-medium">
                    {pending ? "Elige la acción a insertar" : "Acciones"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {pending
                      ? "Se conectará al punto que elegiste."
                      : "Toca un “+” en el lienzo o una acción para agregarla."}
                  </p>
                </div>
                <div className="relative">
                  <Search
                    className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    value={actionQuery}
                    onChange={(event) => setActionQuery(event.target.value)}
                    placeholder="Buscar acción"
                    aria-label="Buscar acción"
                    className="pl-9"
                  />
                </div>
                <div className="grid gap-4">
                  {ACTION_CATALOG.map((group) => {
                    const kinds = group.kinds.filter((kind) =>
                      STEP_META[kind].label
                        .toLowerCase()
                        .includes(actionQuery.trim().toLowerCase()),
                    );
                    if (kinds.length === 0) {
                      return null;
                    }
                    return (
                      <div key={group.group} className="grid gap-1.5">
                        <p className="text-xs font-medium text-muted-foreground">
                          {group.group}
                        </p>
                        {kinds.map((kind) => {
                          const meta = STEP_META[kind];
                          const Icon = meta.icon;
                          return (
                            <button
                              key={kind}
                              type="button"
                              onClick={() => addStep(kind)}
                              className="flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors outline-none hover:border-primary/40 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                            >
                              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                                <Icon className="size-4" aria-hidden="true" />
                              </span>
                              {meta.label}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
                {pending && (
                  <Button variant="ghost" size="sm" onClick={() => setPending(null)}>
                    <X data-icon="inline-start" aria-hidden="true" />
                    Cancelar inserción
                  </Button>
                )}
              </>
            ) : (
              <StepConfig
                step={selectedStep}
                onChange={updateSelected}
                onSwitchCaseChange={updateSwitchCase}
                onAddCase={() =>
                  updateSelected({
                    cases: [...(selectedStep.data.cases ?? []), ""],
                  })
                }
                onRemoveCase={(index) =>
                  updateSelected({
                    cases: (selectedStep.data.cases ?? []).filter(
                      (_, i) => i !== index,
                    ),
                  })
                }
                onRemove={removeSelected}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        El motor de ejecución de flujos está fuera del alcance de esta entrega:
        las automatizaciones se diseñan y guardan, y el estado Activa indica que
        quedarían en producción.
      </p>
    </div>
  );
}

type StepConfigProps = {
  step: Step;
  onChange: (patch: Partial<StepData>) => void;
  onSwitchCaseChange: (index: number, value: string) => void;
  onAddCase: () => void;
  onRemoveCase: (index: number) => void;
  onRemove: () => void;
};

function StepConfig({
  step,
  onChange,
  onSwitchCaseChange,
  onAddCase,
  onRemoveCase,
  onRemove,
}: StepConfigProps) {
  const { data } = step;

  return (
    <>
      <p className="font-medium">{STEP_META[data.kind].label}</p>

      {data.kind === "trigger" && (
        <div className="grid gap-2">
          <Label htmlFor="cfg-trigger">Evento</Label>
          <Select
            items={TRIGGER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={data.trigger ?? "contact_created"}
            onValueChange={(value) => onChange({ trigger: value as string })}
          >
            <SelectTrigger id="cfg-trigger" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRIGGER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {data.kind === "wait" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-2">
            <Label htmlFor="cfg-amount">Cantidad</Label>
            <Input
              id="cfg-amount"
              type="number"
              min="1"
              value={String(data.amount ?? 1)}
              onChange={(event) =>
                onChange({ amount: Number(event.target.value) || 1 })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cfg-unit">Unidad</Label>
            <Select
              items={WAIT_UNITS.map((o) => ({ value: o.value, label: o.label }))}
              value={data.unit ?? "days"}
              onValueChange={(value) =>
                onChange({ unit: value as StepData["unit"] })
              }
            >
              <SelectTrigger id="cfg-unit" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WAIT_UNITS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {data.kind === "send_whatsapp" && (
        <div className="grid gap-2">
          <Label htmlFor="cfg-message">Mensaje de WhatsApp</Label>
          <VariableTextarea
            id="cfg-message"
            value={data.message ?? ""}
            onChange={(value) => onChange({ message: value })}
            placeholder="¡Hola {{nombre}}! Tu paquete {{tracking}} va en camino."
          />
          <VariableHint />
        </div>
      )}

      {data.kind === "send_email" && (
        <>
          <div className="grid gap-2">
            <Label htmlFor="cfg-subject">Asunto</Label>
            <Input
              id="cfg-subject"
              value={data.subject ?? ""}
              onChange={(event) => onChange({ subject: event.target.value })}
              placeholder="Tu paquete está en camino"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cfg-body">Cuerpo</Label>
            <VariableTextarea
              id="cfg-body"
              value={data.body ?? ""}
              onChange={(value) => onChange({ body: value })}
              placeholder="Hola {{nombre}}, …"
            />
            <VariableHint />
          </div>
        </>
      )}

      {data.kind === "add_tag" && (
        <div className="grid gap-2">
          <Label htmlFor="cfg-tag">Etiqueta</Label>
          <Input
            id="cfg-tag"
            value={data.tag ?? ""}
            onChange={(event) => onChange({ tag: event.target.value })}
            placeholder="bienvenida"
          />
        </div>
      )}

      {data.kind === "send_webhook" && (
        <>
          <div className="grid gap-2">
            <Label htmlFor="cfg-url">URL de destino</Label>
            <Input
              id="cfg-url"
              value={data.url ?? ""}
              onChange={(event) => onChange({ url: event.target.value })}
              placeholder="https://api.ejemplo.com/hook"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cfg-method">Método</Label>
            <Select
              items={WEBHOOK_METHODS.map((o) => ({ value: o.value, label: o.label }))}
              value={data.method ?? "POST"}
              onValueChange={(value) =>
                onChange({ method: value as "POST" | "GET" })
              }
            >
              <SelectTrigger id="cfg-method" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEBHOOK_METHODS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {(data.kind === "condition" || data.kind === "switch") && (
        <div className="grid gap-2">
          <Label htmlFor="cfg-field">Campo</Label>
          <Select
            items={BRANCH_FIELDS.map((o) => ({ value: o.value, label: o.label }))}
            value={data.field ?? "tag"}
            onValueChange={(value) => onChange({ field: value as string })}
          >
            <SelectTrigger id="cfg-field" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BRANCH_FIELDS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {data.kind === "condition" && (
        <>
          <div className="grid gap-2">
            <Label htmlFor="cfg-operator">Operador</Label>
            <Select
              items={CONDITION_OPERATORS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              value={data.operator ?? "equals"}
              onValueChange={(value) => onChange({ operator: value as string })}
            >
              <SelectTrigger id="cfg-operator" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_OPERATORS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {data.operator !== "exists" && (
            <div className="grid gap-2">
              <Label htmlFor="cfg-value">Valor</Label>
              <Input
                id="cfg-value"
                value={data.value ?? ""}
                onChange={(event) => onChange({ value: event.target.value })}
                placeholder="vip"
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            El flujo sigue por la rama “Sí” cuando se cumple, o “No” en caso
            contrario.
          </p>
        </>
      )}

      {data.kind === "switch" && (
        <div className="grid gap-2">
          <Label>Casos</Label>
          {(data.cases ?? []).map((value, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={value}
                onChange={(event) => onSwitchCaseChange(index, event.target.value)}
                placeholder={`Caso ${index + 1}`}
                aria-label={`Caso ${index + 1}`}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Eliminar caso ${index + 1}`}
                onClick={() => onRemoveCase(index)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={onAddCase}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            Agregar caso
          </Button>
          <p className="text-xs text-muted-foreground">
            Cada caso es una rama; “Otro” recoge lo que no coincida.
          </p>
        </div>
      )}

      {data.kind !== "trigger" && (
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "justify-self-start text-destructive hover:bg-destructive/10 hover:text-destructive",
          )}
          onClick={onRemove}
        >
          <Trash2 data-icon="inline-start" aria-hidden="true" />
          Eliminar paso
        </Button>
      )}
    </>
  );
}

function VariableHint() {
  return (
    <p className="text-xs text-muted-foreground">
      Variables:{" "}
      <code className="rounded bg-primary/15 px-1 font-medium text-primary">
        {"{{nombre}}"}
      </code>{" "}
      <code className="rounded bg-primary/15 px-1 font-medium text-primary">
        {"{{tracking}}"}
      </code>
    </p>
  );
}
