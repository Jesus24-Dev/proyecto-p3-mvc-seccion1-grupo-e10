import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Background,
  Controls,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, Copy, Play, Plus, Save, Trash2 } from "lucide-react";
import { ApiRequestError, automationsApi } from "@/api";
import { useAuth } from "@/context/AuthContext";
import { useMutationHandler } from "@/hooks/usePageData";
import {
  ADDABLE_STEPS,
  STEP_META,
  TRIGGER_OPTIONS,
  WAIT_UNITS,
  defaultDataFor,
  type StepData,
  type StepKind,
} from "@/lib/automationSteps";
import { StepNodeComponent, type StepNode } from "@/components/automations/StepNode";
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
import type { Automation, AutomationDefinition } from "@/types";

/** `folder` aún no está declarado en los tipos compartidos; se anota localmente. */

const nodeTypes = { step: StepNodeComponent };

const WEBHOOK_METHODS = [
  { value: "POST", label: "POST" },
  { value: "GET", label: "GET" },
] as const;

const initialNodes: StepNode[] = [
  {
    id: "trigger",
    type: "step",
    position: { x: 40, y: 160 },
    data: defaultDataFor("trigger"),
  },
];

export function AutomationEditorPage() {
  const { automationId } = useParams();
  const isNew = !automationId || automationId === "nueva";
  const navigate = useNavigate();
  const { expireSession } = useAuth();
  const runMutation = useMutationHandler();

  const [nodes, setNodes, onNodesChange] = useNodesState<StepNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [name, setName] = useState("Nueva automatización");
  const [folder, setFolder] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [notice, setNotice] = useState<{
    text: string;
    tone: "success" | "danger";
  } | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) {
      return;
    }

    let isCancelled = false;

    automationsApi
      .get(automationId!)
      .then((automation) => {
        if (isCancelled) {
          return;
        }
        setName(automation.name);
        setFolder(automation.folder ?? "");
        setIsActive(automation.is_active);
        setNodes(automation.definition.nodes as unknown as StepNode[]);
        setEdges(automation.definition.edges as unknown as Edge[]);
      })
      .catch((caughtError: unknown) => {
        if (isCancelled) {
          return;
        }
        if (
          caughtError instanceof ApiRequestError &&
          (caughtError.statusCode === 401 || caughtError.statusCode === 403)
        ) {
          expireSession(caughtError.message);
          return;
        }
        setNotice({
          text:
            caughtError instanceof Error
              ? caughtError.message
              : "No se pudo cargar la automatización.",
          tone: "danger",
        });
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [automationId, isNew, setNodes, setEdges, expireSession]);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((currentEdges) => addEdge(connection, currentEdges)),
    [setEdges],
  );

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const incomingWebhookUrl = isNew
    ? ""
    : `${window.location.origin}/hooks/automations/${automationId}`;

  function addStep(kind: StepKind) {
    const id = `n${Date.now().toString(36)}`;
    const lastNode = nodes[nodes.length - 1];

    setNodes((currentNodes) => [
      ...currentNodes,
      {
        id,
        type: "step",
        position: {
          x: (lastNode?.position.x ?? 0) + 280,
          y: lastNode?.position.y ?? 160,
        },
        data: defaultDataFor(kind),
      },
    ]);
    setSelectedNodeId(id);
  }

  function updateSelectedNode(patch: Partial<StepData>) {
    if (!selectedNodeId) {
      return;
    }

    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === selectedNodeId
          ? { ...node, data: { ...node.data, ...patch } }
          : node,
      ),
    );
  }

  function removeSelectedNode() {
    if (!selectedNode || selectedNode.data.kind === "trigger") {
      return;
    }

    setNodes((currentNodes) =>
      currentNodes.filter((node) => node.id !== selectedNodeId),
    );
    setEdges((currentEdges) =>
      currentEdges.filter(
        (edge) =>
          edge.source !== selectedNodeId && edge.target !== selectedNodeId,
      ),
    );
    setSelectedNodeId(null);
  }

  async function handleSave() {
    setIsSaving(true);
    setNotice(null);

    const definition: AutomationDefinition = {
      nodes: nodes as unknown as AutomationDefinition["nodes"],
      edges: edges as unknown as AutomationDefinition["edges"],
    };

    const payload = {
      name,
      folder: folder.trim() || undefined,
      is_active: isActive,
      definition,
    };

    const failure = await runMutation(async () => {
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

  async function handleTestTrigger() {
    if (isNew) {
      return;
    }

    setIsTesting(true);
    setNotice(null);

    try {
      const result = await automationsApi.triggerWebhook(automationId!, {
        source: "manual_test",
      });
      const stepLabels = (result.steps ?? [])
        .map((step) => {
          if (!step.kind) {
            return null;
          }
          return step.kind in STEP_META
            ? STEP_META[step.kind as StepKind].label
            : step.kind;
        })
        .filter((label): label is string => Boolean(label));

      setNotice({
        text:
          stepLabels.length > 0
            ? `Disparador ejecutado (${result.status ?? "en cola"}): ${stepLabels.join(" → ")}`
            : `Disparador ejecutado: ${result.status ?? "en cola"}.`,
        tone: "success",
      });
    } catch (caughtError) {
      setNotice({
        text:
          caughtError instanceof Error
            ? caughtError.message
            : "No se pudo probar el disparador.",
        tone: "danger",
      });
    } finally {
      setIsTesting(false);
    }
  }

  if (isLoading) {
    return <Skeleton className="h-[70vh] rounded-xl" />;
  }

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
          aria-label="Carpeta"
          placeholder="Carpeta"
          className="h-9 max-w-[11rem]"
        />
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
              onClick={() => void handleTestTrigger()}
              disabled={isTesting}
            >
              <Play data-icon="inline-start" aria-hidden="true" />
              {isTesting ? "Probando…" : "Probar disparador"}
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

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Agregar paso:</span>
        {ADDABLE_STEPS.map((kind) => {
          const meta = STEP_META[kind];
          return (
            <Button
              key={kind}
              variant="outline"
              size="sm"
              onClick={() => addStep(kind)}
            >
              <Plus data-icon="inline-start" aria-hidden="true" />
              {meta.label}
            </Button>
          );
        })}
      </div>

      <div className="grid min-h-0 flex-1 items-stretch gap-4 lg:grid-cols-[1fr_18rem]">
        <Card className="min-h-0 overflow-hidden p-0">
          <div className="h-full min-h-[460px]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(null)}
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
            {!selectedNode ? (
              <p className="text-sm text-muted-foreground">
                Selecciona un paso del lienzo para configurarlo, o conecta los
                pasos arrastrando desde sus bordes.
              </p>
            ) : (
              <>
                <p className="font-medium">
                  {STEP_META[selectedNode.data.kind].label}
                </p>

                {selectedNode.data.kind === "trigger" && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="step-trigger">Evento</Label>
                      <Select
                        items={TRIGGER_OPTIONS.map((option) => ({
                          value: option.value,
                          label: option.label,
                        }))}
                        value={selectedNode.data.trigger ?? "contact_created"}
                        onValueChange={(value) =>
                          updateSelectedNode({ trigger: value as string })
                        }
                      >
                        <SelectTrigger id="step-trigger" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRIGGER_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedNode.data.trigger === "webhook_received" && (
                      <div className="grid gap-2">
                        <Label htmlFor="incoming-webhook-url">
                          URL del webhook entrante
                        </Label>
                        {isNew ? (
                          <p className="text-sm text-muted-foreground">
                            Guarda la automatización para generar la URL
                          </p>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input
                              id="incoming-webhook-url"
                              readOnly
                              value={incomingWebhookUrl}
                              className="flex-1 font-mono text-xs"
                            />
                            <Button
                              variant="outline"
                              size="icon-sm"
                              aria-label="Copiar URL del webhook"
                              onClick={() =>
                                void navigator.clipboard.writeText(
                                  incomingWebhookUrl,
                                )
                              }
                            >
                              <Copy aria-hidden="true" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {selectedNode.data.kind === "wait" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-2">
                      <Label htmlFor="step-amount">Cantidad</Label>
                      <Input
                        id="step-amount"
                        type="number"
                        min="1"
                        value={String(selectedNode.data.amount ?? 1)}
                        onChange={(event) =>
                          updateSelectedNode({
                            amount: Number(event.target.value) || 1,
                          })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="step-unit">Unidad</Label>
                      <Select
                        items={WAIT_UNITS.map((option) => ({
                          value: option.value,
                          label: option.label,
                        }))}
                        value={selectedNode.data.unit ?? "days"}
                        onValueChange={(value) =>
                          updateSelectedNode({
                            unit: value as StepData["unit"],
                          })
                        }
                      >
                        <SelectTrigger id="step-unit" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WAIT_UNITS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {selectedNode.data.kind === "send_whatsapp" && (
                  <div className="grid gap-2">
                    <Label htmlFor="step-message">Mensaje de WhatsApp</Label>
                    <textarea
                      id="step-message"
                      value={selectedNode.data.message ?? ""}
                      onChange={(event) =>
                        updateSelectedNode({ message: event.target.value })
                      }
                      rows={4}
                      placeholder="Hola {{nombre}}, tu paquete {{tracking}}…"
                      className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      Variables: {"{{nombre}}"}, {"{{tracking}}"}.
                    </p>
                  </div>
                )}

                {selectedNode.data.kind === "send_email" && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="step-subject">Asunto</Label>
                      <Input
                        id="step-subject"
                        value={selectedNode.data.subject ?? ""}
                        onChange={(event) =>
                          updateSelectedNode({ subject: event.target.value })
                        }
                        placeholder="Tu paquete está en camino"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="step-body">Cuerpo</Label>
                      <textarea
                        id="step-body"
                        value={selectedNode.data.body ?? ""}
                        onChange={(event) =>
                          updateSelectedNode({ body: event.target.value })
                        }
                        rows={4}
                        className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      />
                    </div>
                  </>
                )}

                {selectedNode.data.kind === "send_webhook" && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="step-url">URL de destino</Label>
                      <Input
                        id="step-url"
                        type="url"
                        value={selectedNode.data.url ?? ""}
                        onChange={(event) =>
                          updateSelectedNode({ url: event.target.value })
                        }
                        placeholder="https://api.ejemplo.com/hooks"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="step-method">Método</Label>
                      <Select
                        items={WEBHOOK_METHODS.map((option) => ({
                          value: option.value,
                          label: option.label,
                        }))}
                        value={selectedNode.data.method ?? "POST"}
                        onValueChange={(value) =>
                          updateSelectedNode({
                            method: value as StepData["method"],
                          })
                        }
                      >
                        <SelectTrigger id="step-method" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WEBHOOK_METHODS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {selectedNode.data.kind === "add_tag" && (
                  <div className="grid gap-2">
                    <Label htmlFor="step-tag">Etiqueta</Label>
                    <Input
                      id="step-tag"
                      value={selectedNode.data.tag ?? ""}
                      onChange={(event) =>
                        updateSelectedNode({ tag: event.target.value })
                      }
                      placeholder="bienvenida"
                    />
                    <p className="text-xs text-muted-foreground">
                      Se agrega a las etiquetas del contacto del flujo.
                    </p>
                  </div>
                )}

                {selectedNode.data.kind !== "trigger" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-self-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={removeSelectedNode}
                  >
                    <Trash2 data-icon="inline-start" aria-hidden="true" />
                    Eliminar paso
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        El motor de ejecución de flujos está fuera del alcance de esta entrega:
        las automatizaciones se diseñan y guardan, y el estado Activa indica
        que quedarían en producción.
      </p>
    </div>
  );
}
