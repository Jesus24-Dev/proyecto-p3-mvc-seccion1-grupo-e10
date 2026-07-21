// Tipos del lienzo (formato React Flow) que guarda `automations.definition`.
// Coinciden con el modelo del editor en frontend/src/lib/automationSteps.ts.

export type StepKind =
  | "trigger"
  | "wait"
  | "send_whatsapp"
  | "send_instagram"
  | "send_messenger"
  | "send_email"
  | "add_tag"
  | "remove_tag"
  | "update_contact"
  | "notify_team"
  | "create_note"
  | "send_webhook"
  | "ai_generate"
  | "condition"
  | "switch";

export type StepData = {
  kind: StepKind;
  trigger?: string;
  amount?: number;
  unit?: "minutes" | "hours" | "days";
  message?: string;
  subject?: string;
  body?: string;
  email_mode?: "template" | "custom";
  template_id?: string;
  tag?: string;
  note_kind?: string;
  url?: string;
  method?: "POST" | "GET";
  field?: string;
  operator?: string;
  value?: string;
  cases?: string[];
  /** ai_generate: instrucción para el modelo y variable donde guardar el texto. */
  ai_prompt?: string;
  ai_output?: string;
  label?: string;
  [key: string]: unknown;
};

export type FlowNode = {
  id: string;
  type?: string;
  data: StepData;
};

export type FlowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
};

export type FlowDefinition = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  variables?: string[];
  settings?: Record<string, unknown>;
};

// Contexto resuelto de una ejecución: variables para interpolar + campos
// crudos para evaluar condiciones/switch.
export type EngineContext = {
  contactId: string | null;
  contactName: string;
  vars: Record<string, string>;
  tags: string[];
  agency: string;
  packageStatus: string;
  orderStatus: string;
};

// Resultado de ejecutar un nodo (excepto "wait", que maneja el motor).
export type ExecResult = {
  result: "OK" | "ERROR" | "INFO";
  detail: string;
  // Salida por la que continúa el flujo ("out", "true"/"false", "case:x"...).
  branchId: string;
};
