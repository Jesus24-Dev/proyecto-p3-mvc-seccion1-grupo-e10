// Generación de texto con IA para el paso "ai_generate". El proveedor y la
// clave de API se inyectan desde los Ajustes del flujo (editor); si el flujo
// no trae clave, cae a la variable de entorno del servidor.

export type AiSettings = {
  provider?: string | undefined; // "openai" | "anthropic"
  model?: string | undefined;
  apiKey?: string | undefined;
};

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-latest",
};

const SYSTEM_PROMPT =
  "Eres un asistente de Dr Logistics (empresa de logística y encomiendas). " +
  "Respondes en español, con un tono profesional y cálido, en un texto breve " +
  "listo para enviarse al cliente por WhatsApp o correo. Devuelve únicamente el " +
  "texto pedido, sin comillas, sin encabezados ni explicaciones.";

export async function generateAiText(
  prompt: string,
  settings: AiSettings,
): Promise<string> {
  const provider = (settings.provider ?? "openai").toLowerCase();
  // La clave del flujo manda; si falta, se usa la del servidor.
  const apiKey =
    settings.apiKey?.trim() ||
    (provider === "anthropic"
      ? process.env.ANTHROPIC_API_KEY
      : process.env.OPENAI_API_KEY);
  if (!apiKey) {
    throw new Error(
      `Falta la clave de API de ${provider === "anthropic" ? "Anthropic" : "OpenAI"}. ` +
        "Agrégala en Ajustes → IA del flujo.",
    );
  }
  const model =
    settings.model?.trim() || DEFAULT_MODELS[provider] || DEFAULT_MODELS.openai!;

  return provider === "anthropic"
    ? callAnthropic(apiKey, model, prompt)
    : callOpenai(apiKey, model, prompt);
}

async function callOpenai(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.6,
      max_tokens: 500,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI respondió con error (${response.status}).`);
  }
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI no devolvió contenido utilizable.");
  }
  return content;
}

async function callAnthropic(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) {
    throw new Error(`Anthropic respondió con error (${response.status}).`);
  }
  const payload = (await response.json()) as {
    content?: Array<{ text?: string }>;
  };
  const content = payload.content?.[0]?.text?.trim();
  if (!content) {
    throw new Error("Anthropic no devolvió contenido utilizable.");
  }
  return content;
}
