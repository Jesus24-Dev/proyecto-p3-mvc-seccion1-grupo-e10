import {
  BellRing,
  Camera,
  Clock,
  Eraser,
  GitBranch,
  Mail,
  MessageCircle,
  MessagesSquare,
  NotebookPen,
  Split,
  Tag,
  UserCog,
  Webhook,
  Zap,
  type LucideIcon,
} from "lucide-react";

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
  | "condition"
  | "switch";

export type StepData = {
  kind: StepKind;
  /** trigger */
  trigger?: string;
  /** wait */
  amount?: number;
  unit?: "minutes" | "hours" | "days";
  /** send_whatsapp */
  message?: string;
  /** send_email */
  subject?: string;
  body?: string;
  /** "template" usa una plantilla guardada; "custom" redacta aquí. */
  email_mode?: "template" | "custom";
  template_id?: string;
  from_domain?: string;
  /** add_tag / remove_tag */
  tag?: string;
  /** create_note */
  note_kind?: string;
  /** send_webhook */
  url?: string;
  method?: "POST" | "GET";
  /** condition / switch */
  field?: string;
  operator?: string;
  value?: string;
  cases?: string[];
  /** Personalización visual del nodo */
  label?: string;
  color?: string;
  [key: string]: unknown;
};

/** Colores disponibles para el icono del nodo (clases completas de Tailwind). */
export const NODE_COLORS = [
  { id: "slate", label: "Gris", chip: "bg-muted text-foreground", dot: "#64748b" },
  { id: "red", label: "Rojo", chip: "bg-red-100 text-red-700", dot: "#dc2626" },
  { id: "amber", label: "Ámbar", chip: "bg-amber-100 text-amber-700", dot: "#d97706" },
  { id: "emerald", label: "Verde", chip: "bg-emerald-100 text-emerald-700", dot: "#059669" },
  { id: "blue", label: "Azul", chip: "bg-blue-100 text-blue-700", dot: "#2563eb" },
  { id: "violet", label: "Violeta", chip: "bg-violet-100 text-violet-700", dot: "#7c3aed" },
] as const;

export function nodeChipClass(color: string | undefined): string {
  return (
    NODE_COLORS.find((option) => option.id === color)?.chip ??
    "bg-muted text-foreground"
  );
}

/** Paleta de las notas adhesivas (fondo relleno estilo post-it). */
export const NOTE_COLORS = [
  {
    id: "amber",
    label: "Ámbar",
    swatch: "#f59e0b",
    body: "bg-amber-100 border-amber-300 text-amber-950",
  },
  {
    id: "emerald",
    label: "Verde",
    swatch: "#10b981",
    body: "bg-emerald-100 border-emerald-300 text-emerald-950",
  },
  {
    id: "blue",
    label: "Azul",
    swatch: "#3b82f6",
    body: "bg-blue-100 border-blue-300 text-blue-950",
  },
  {
    id: "violet",
    label: "Violeta",
    swatch: "#8b5cf6",
    body: "bg-violet-100 border-violet-300 text-violet-950",
  },
  {
    id: "rose",
    label: "Rosa",
    swatch: "#f43f5e",
    body: "bg-rose-100 border-rose-300 text-rose-950",
  },
  {
    id: "slate",
    label: "Gris",
    swatch: "#64748b",
    body: "bg-slate-100 border-slate-300 text-slate-900",
  },
] as const;

export const DEFAULT_NOTE_COLOR = NOTE_COLORS[0].id;

export function noteBodyClass(color: string | undefined): string {
  return NOTE_COLORS.find((option) => option.id === color)?.body ?? NOTE_COLORS[0].body;
}

/** Variable interpolable en mensajes ({{token}}). */
export type AutomationVariable = {
  token: string;
  label: string;
  description?: string;
  custom?: boolean;
};

/** Variables integradas, derivadas del contacto y su paquete/envío. */
export const AUTOMATION_VARIABLES: AutomationVariable[] = [
  { token: "nombre", label: "Nombre", description: "Nombre del contacto" },
  { token: "apellido", label: "Apellido", description: "Apellido del contacto" },
  { token: "email", label: "Email", description: "Correo del contacto" },
  { token: "telefono", label: "Teléfono", description: "Teléfono del contacto" },
  { token: "agencia", label: "Agencia", description: "Agencia del contacto" },
  { token: "tracking", label: "Tracking", description: "Código de rastreo del paquete" },
  { token: "paquete", label: "Paquete", description: "Descripción del paquete" },
  {
    token: "estado_paquete",
    label: "Estado del paquete",
    description: "Estado actual del paquete",
  },
  {
    token: "estado_envio",
    label: "Estado del envío",
    description: "Estado actual del envío",
  },
];

/** Convierte un nombre libre en un token válido para {{token}}. */
export function normalizeVariableToken(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^\w.]/g, "");
}

/** Une las variables integradas con las personalizadas del flujo, sin duplicar. */
export function mergeVariables(custom: string[]): AutomationVariable[] {
  const seen = new Set(AUTOMATION_VARIABLES.map((variable) => variable.token));
  const extras: AutomationVariable[] = [];
  for (const raw of custom) {
    const token = normalizeVariableToken(raw);
    if (token && !seen.has(token)) {
      seen.add(token);
      extras.push({
        token,
        label: raw.trim() || token,
        description: "Variable personalizada",
        custom: true,
      });
    }
  }
  return [...AUTOMATION_VARIABLES, ...extras];
}

/** Campos del contacto que puede actualizar el paso "actualizar contacto". */
export const CONTACT_FIELDS = [
  { value: "phone", label: "Teléfono" },
  { value: "address", label: "Dirección" },
  { value: "first_name", label: "Nombre" },
  { value: "last_name", label: "Apellido" },
  { value: "document_id", label: "Cédula/RIF" },
] as const;

/** Tipos de nota CRM para el paso "crear nota". */
export const NOTE_KINDS = [
  { value: "NOTE", label: "Nota" },
  { value: "OBSERVATION", label: "Observación" },
  { value: "INCIDENT", label: "Incidencia" },
] as const;

/** Campos del contacto/evento sobre los que ramifica un condicional. */
export const BRANCH_FIELDS = [
  { value: "tag", label: "Etiqueta del contacto" },
  { value: "agency", label: "Agencia del contacto" },
  { value: "package_status", label: "Estado del paquete" },
  { value: "order_status", label: "Estado del envío" },
] as const;

export const CONDITION_OPERATORS = [
  { value: "equals", label: "es igual a" },
  { value: "not_equals", label: "es distinto de" },
  { value: "contains", label: "contiene" },
  { value: "exists", label: "existe" },
] as const;

/** Salidas (handles de origen) de un nodo según su tipo. */
export type StepBranch = { id: string; label: string };

export function branchesFor(data: StepData): StepBranch[] {
  if (data.kind === "condition") {
    return [
      { id: "true", label: "Sí" },
      { id: "false", label: "No" },
    ];
  }
  if (data.kind === "switch") {
    const cases = (data.cases ?? []).filter((item) => item.trim().length > 0);
    return [
      ...cases.map((item) => ({ id: `case:${item}`, label: item })),
      { id: "default", label: "Otro" },
    ];
  }
  // Un solo camino de salida para el resto de pasos (los disparadores incluidos).
  return [{ id: "out", label: "" }];
}

export const TRIGGER_OPTIONS = [
  { value: "contact_created", label: "Contacto creado" },
  { value: "tag_added", label: "Etiqueta agregada a un contacto" },
  { value: "package_delivered", label: "Paquete entregado" },
  { value: "order_completed", label: "Envío completado" },
  { value: "webhook_received", label: "Webhook recibido" },
] as const;

export const WAIT_UNITS = [
  { value: "minutes", label: "minutos" },
  { value: "hours", label: "horas" },
  { value: "days", label: "días" },
] as const;

type StepMeta = {
  label: string;
  icon: LucideIcon;
  /** Resumen de una línea mostrado dentro del nodo. */
  summary: (data: StepData) => string;
};

export const STEP_META: Record<StepKind, StepMeta> = {
  trigger: {
    label: "Disparador",
    icon: Zap,
    summary: (data) =>
      TRIGGER_OPTIONS.find((option) => option.value === data.trigger)?.label ??
      "Elige un evento",
  },
  wait: {
    label: "Esperar",
    icon: Clock,
    summary: (data) => {
      const unit =
        WAIT_UNITS.find((option) => option.value === data.unit)?.label ??
        "días";
      return `${data.amount ?? 1} ${unit}`;
    },
  },
  send_whatsapp: {
    label: "Enviar WhatsApp",
    icon: MessageCircle,
    summary: (data) =>
      data.message ? `"${data.message.slice(0, 42)}…"` : "Escribe el mensaje",
  },
  send_instagram: {
    label: "Enviar Instagram DM",
    icon: Camera,
    summary: (data) =>
      data.message ? `"${data.message.slice(0, 42)}…"` : "Escribe el mensaje",
  },
  send_messenger: {
    label: "Enviar Messenger",
    icon: MessagesSquare,
    summary: (data) =>
      data.message ? `"${data.message.slice(0, 42)}…"` : "Escribe el mensaje",
  },
  send_email: {
    label: "Enviar email",
    icon: Mail,
    summary: (data) =>
      data.email_mode === "template"
        ? data.template_id
          ? "Plantilla de correo"
          : "Elige una plantilla"
        : data.subject || "Define el asunto",
  },
  add_tag: {
    label: "Agregar etiqueta",
    icon: Tag,
    summary: (data) => (data.tag ? `#${data.tag}` : "Elige la etiqueta"),
  },
  remove_tag: {
    label: "Quitar etiqueta",
    icon: Eraser,
    summary: (data) => (data.tag ? `#${data.tag}` : "Elige la etiqueta"),
  },
  update_contact: {
    label: "Actualizar contacto",
    icon: UserCog,
    summary: (data) => {
      const field =
        CONTACT_FIELDS.find((option) => option.value === data.field)?.label ??
        "Campo";
      return data.value
        ? `${field} = "${data.value.slice(0, 24)}"`
        : `Define ${field.toLowerCase()}`;
    },
  },
  notify_team: {
    label: "Notificar al equipo",
    icon: BellRing,
    summary: (data) =>
      data.message ? `"${data.message.slice(0, 42)}…"` : "Escribe el aviso",
  },
  create_note: {
    label: "Crear nota",
    icon: NotebookPen,
    summary: (data) =>
      data.body?.trim() ? data.body.slice(0, 42) : "Escribe la nota",
  },
  send_webhook: {
    label: "Enviar webhook",
    icon: Webhook,
    summary: (data) => {
      if (!data.url) {
        return "Define la URL de destino";
      }
      const method = data.method ?? "POST";
      try {
        return `${method} ${new URL(data.url).host}`;
      } catch {
        return `${method} ${data.url.slice(0, 32)}`;
      }
    },
  },
  condition: {
    label: "Condición (Sí / No)",
    icon: GitBranch,
    summary: (data) => {
      const field =
        BRANCH_FIELDS.find((option) => option.value === data.field)?.label ??
        "Elige un campo";
      const operator = CONDITION_OPERATORS.find(
        (option) => option.value === data.operator,
      )?.label;
      if (!operator) {
        return field;
      }
      return data.operator === "exists"
        ? `${field} ${operator}`
        : `${field} ${operator} "${data.value ?? ""}"`;
    },
  },
  switch: {
    label: "Bifurcar (switch)",
    icon: Split,
    summary: (data) => {
      const field =
        BRANCH_FIELDS.find((option) => option.value === data.field)?.label ??
        "Elige un campo";
      const count = (data.cases ?? []).filter((c) => c.trim()).length;
      return `${field} · ${count} caso${count === 1 ? "" : "s"}`;
    },
  },
};

/**
 * Devuelve un mensaje si el paso no está configurado correctamente, o null si
 * está listo. Lo usa el nodo para mostrar un aviso (punto amarillo).
 */
export function stepWarning(data: StepData): string | null {
  switch (data.kind) {
    case "trigger":
      return data.trigger ? null : "Elige un evento disparador.";
    case "wait":
      return data.amount && data.amount > 0
        ? null
        : "Define una espera mayor que cero.";
    case "send_whatsapp":
      return data.message?.trim() ? null : "Escribe el mensaje de WhatsApp.";
    case "send_instagram":
      return data.message?.trim() ? null : "Escribe el mensaje de Instagram.";
    case "send_messenger":
      return data.message?.trim() ? null : "Escribe el mensaje de Messenger.";
    case "send_email":
      if (data.email_mode === "template") {
        return data.template_id ? null : "Elige una plantilla de correo.";
      }
      return data.subject?.trim() ? null : "Define el asunto del email.";
    case "add_tag":
      return data.tag?.trim() ? null : "Elige la etiqueta a agregar.";
    case "remove_tag":
      return data.tag?.trim() ? null : "Elige la etiqueta a quitar.";
    case "update_contact":
      if (!data.field) return "Elige un campo del contacto.";
      return data.value?.trim() ? null : "Escribe el nuevo valor.";
    case "notify_team":
      return data.message?.trim() ? null : "Escribe el aviso para el equipo.";
    case "create_note":
      return data.body?.trim() ? null : "Escribe el contenido de la nota.";
    case "send_webhook":
      return data.url?.trim() ? null : "Define la URL de destino.";
    case "condition":
      if (!data.field) return "Elige un campo.";
      if (!data.operator) return "Elige un operador.";
      if (data.operator !== "exists" && !data.value?.trim())
        return "Ingresa un valor a comparar.";
      return null;
    case "switch": {
      if (!data.field) return "Elige un campo.";
      const cases = (data.cases ?? []).filter((item) => item.trim().length > 0);
      return cases.length > 0 ? null : "Agrega al menos un caso.";
    }
    default:
      return null;
  }
}

export const ADDABLE_STEPS: StepKind[] = [
  "wait",
  "send_whatsapp",
  "send_instagram",
  "send_messenger",
  "send_email",
  "add_tag",
  "remove_tag",
  "update_contact",
  "notify_team",
  "create_note",
  "send_webhook",
  "condition",
  "switch",
];

export function defaultDataFor(kind: StepKind): StepData {
  switch (kind) {
    case "trigger":
      return { kind, trigger: "contact_created" };
    case "wait":
      return { kind, amount: 1, unit: "days" };
    case "send_whatsapp":
    case "send_instagram":
    case "send_messenger":
      return { kind, message: "" };
    case "send_email":
      return { kind, subject: "", body: "", email_mode: "custom" };
    case "add_tag":
    case "remove_tag":
      return { kind, tag: "" };
    case "update_contact":
      return { kind, field: "phone", value: "" };
    case "notify_team":
      return { kind, message: "" };
    case "create_note":
      return { kind, note_kind: "NOTE", body: "" };
    case "send_webhook":
      return { kind, url: "", method: "POST" };
    case "condition":
      return { kind, field: "tag", operator: "equals", value: "" };
    case "switch":
      return { kind, field: "package_status", cases: ["", ""] };
  }
}

/** Divide un texto en segmentos, marcando las variables {{...}}. */
export function splitVariables(
  text: string,
): Array<{ text: string; variable: boolean }> {
  const segments: Array<{ text: string; variable: boolean }> = [];
  const pattern = /\{\{\s*[\w.]+\s*\}\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), variable: false });
    }
    segments.push({ text: match[0], variable: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), variable: false });
  }

  return segments;
}
