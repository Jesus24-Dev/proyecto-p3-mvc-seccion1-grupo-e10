export class AiServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "AiServiceError";
  }
}

// Tipos de paso válidos que la IA puede proponer (sin ramificación por ahora).
const ALLOWED_STEP_KINDS = [
  "wait",
  "send_whatsapp",
  "send_instagram",
  "send_messenger",
  "send_email",
  "add_tag",
  "send_webhook",
] as const;
type AllowedKind = (typeof ALLOWED_STEP_KINDS)[number];

const TRIGGER_EVENTS = [
  "contact_created",
  "tag_added",
  "package_delivered",
  "order_completed",
  "webhook_received",
];

/**
 * Llama al modelo (OpenAI Chat Completions) pidiendo salida JSON. La clave se
 * lee solo en el backend; si falta, lanza un error 503 manejable.
 */
async function callModel(system: string, user: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AiServiceError(
      "La generación con IA no está configurada. Define OPENAI_API_KEY en el servidor.",
      503,
    );
  }
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
  } catch {
    throw new AiServiceError("No se pudo contactar al proveedor de IA.", 502);
  }

  if (!response.ok) {
    throw new AiServiceError(
      `El proveedor de IA respondió con error (${response.status}).`,
      502,
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new AiServiceError("La IA no devolvió contenido utilizable.", 502);
  }
  return content;
}

function parseJson<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new AiServiceError("La IA devolvió una respuesta no válida.", 502);
  }
}

export class AiService {
  /** Genera asunto + cuerpo de un correo a partir de una descripción. */
  async generateEmail(prompt: string): Promise<{ subject: string; body: string }> {
    const system = [
      "Eres un asistente que redacta correos para una empresa de logística (Dr Logistics).",
      "Devuelve SOLO un objeto JSON con las claves: subject (string) y body (string).",
      "El body debe ser HTML simple y limpio: usa <p>, <strong>, <em>, <ul>/<li>, <a href>, <h2> cuando aporten. Sin <html>, <head>, <style> ni CSS en línea.",
      "Escribe en español, tono profesional y cálido.",
      "Puedes usar variables entre dobles llaves cuando aplique: {{nombre}}, {{apellido}}, {{tracking}}, {{agencia}}, {{estado_paquete}}.",
      "No incluyas explicaciones, solo el JSON.",
    ].join(" ");
    const raw = await callModel(system, prompt);
    const parsed = parseJson<{ subject?: string; body?: string }>(raw);
    return {
      subject: (parsed.subject ?? "").toString(),
      body: (parsed.body ?? "").toString(),
    };
  }

  /**
   * Genera una automatización lineal (disparador + pasos) a partir de una
   * descripción. Normaliza la salida a la forma del editor (nodes + edges).
   */
  async generateWorkflow(prompt: string): Promise<{
    name: string;
    definition: {
      nodes: Array<{ id: string; type: "step"; position: { x: number; y: number }; data: Record<string, unknown> }>;
      edges: Array<{ id: string; source: string; target: string }>;
    };
  }> {
    const system = [
      "Eres un asistente que diseña automatizaciones para Dr Logistics (logística).",
      "Devuelve SOLO un objeto JSON con: name (string) y steps (array).",
      "Cada step es un objeto con 'kind' y sus campos. Tipos permitidos y campos:",
      "- wait: { amount:number, unit:'minutes'|'hours'|'days' }",
      "- send_whatsapp: { message:string }",
      "- send_instagram: { message:string }",
      "- send_messenger: { message:string }",
      "- send_email: { subject:string, body:string }",
      "- add_tag: { tag:string }",
      "- send_webhook: { url:string, method:'POST'|'GET' }",
      "La secuencia es LINEAL (sin ramificaciones). No incluyas el disparador; se agrega automáticamente.",
      "Usa variables entre dobles llaves cuando aplique: {{nombre}}, {{tracking}}.",
      "Máximo 6 pasos. Responde en español. Solo el JSON.",
    ].join(" ");
    const raw = await callModel(system, prompt);
    const parsed = parseJson<{
      name?: string;
      steps?: Array<Record<string, unknown>>;
    }>(raw);

    const steps = Array.isArray(parsed.steps) ? parsed.steps.slice(0, 6) : [];
    // Nodo disparador siempre primero.
    const nodes: Array<{
      id: string;
      type: "step";
      position: { x: number; y: number };
      data: Record<string, unknown>;
    }> = [
      {
        id: "n0",
        type: "step",
        position: { x: 320, y: 40 },
        data: { kind: "trigger", trigger: "contact_created" },
      },
    ];

    let y = 200;
    for (const step of steps) {
      const kind = String(step.kind);
      if (!ALLOWED_STEP_KINDS.includes(kind as AllowedKind)) {
        continue;
      }
      nodes.push({
        id: `n${nodes.length}`,
        type: "step",
        position: { x: 320, y },
        data: normalizeStep(kind as AllowedKind, step),
      });
      y += 160;
    }

    // Encadena los nodos linealmente.
    const edges: Array<{ id: string; source: string; target: string }> = [];
    for (let index = 0; index < nodes.length - 1; index++) {
      edges.push({
        id: `e${index}`,
        source: nodes[index]!.id,
        target: nodes[index + 1]!.id,
      });
    }

    return {
      name: (parsed.name ?? "Automatización con IA").toString(),
      definition: { nodes, edges },
    };
  }
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

// Coacciona los campos de cada tipo de paso a valores seguros.
function normalizeStep(
  kind: AllowedKind,
  step: Record<string, unknown>,
): Record<string, unknown> {
  switch (kind) {
    case "wait": {
      const amount = Number(step.amount);
      const unit = ["minutes", "hours", "days"].includes(String(step.unit))
        ? String(step.unit)
        : "days";
      return {
        kind,
        amount: Number.isFinite(amount) && amount > 0 ? amount : 1,
        unit,
      };
    }
    case "send_whatsapp":
    case "send_instagram":
    case "send_messenger":
      return { kind, message: str(step.message) };
    case "send_email":
      return {
        kind,
        email_mode: "custom",
        subject: str(step.subject),
        body: str(step.body),
      };
    case "add_tag":
      return { kind, tag: str(step.tag) };
    case "send_webhook":
      return {
        kind,
        url: str(step.url),
        method: String(step.method) === "GET" ? "GET" : "POST",
      };
  }
}
