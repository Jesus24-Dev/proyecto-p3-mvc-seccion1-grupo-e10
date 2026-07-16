// Modelo de datos y serialización del constructor de correos por bloques.
// Los bloques se guardan en el HTML como un comentario oculto
// (`<!--dr-blocks:...-->`) para poder reabrir la plantilla y seguir editándola.

export type BlockAlign = "left" | "center" | "right";
export type SpacerSize = "sm" | "md" | "lg";

export type EmailBlock =
  | { id: string; type: "heading"; text: string; level: 1 | 2 | 3; align: BlockAlign }
  | { id: string; type: "text"; text: string; align: BlockAlign }
  | {
      id: string;
      type: "image";
      src: string;
      alt: string;
      href: string;
      align: BlockAlign;
      width: number;
    }
  | { id: string; type: "button"; label: string; href: string; align: BlockAlign }
  | { id: string; type: "divider" }
  | { id: string; type: "spacer"; size: SpacerSize }
  | { id: string; type: "columns"; left: string; right: string }
  | { id: string; type: "html"; code: string };

export type EmailBlockType = EmailBlock["type"];

export type EmailSettings = {
  contentWidth: number;
  pageBg: string;
  contentBg: string;
  fontFamily: string;
  textColor: string;
  buttonColor: string;
  buttonTextColor: string;
  linkColor: string;
};

export type EmailDocument = {
  blocks: EmailBlock[];
  settings: EmailSettings;
};

export const DEFAULT_SETTINGS: EmailSettings = {
  contentWidth: 600,
  pageBg: "#f3f4f6",
  contentBg: "#ffffff",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  textColor: "#1f2937",
  buttonColor: "#c2381d",
  buttonTextColor: "#ffffff",
  linkColor: "#c2381d",
};

const SPACER_PX: Record<SpacerSize, number> = { sm: 12, md: 28, lg: 48 };

const FONT_OPTIONS: { label: string; value: string }[] = [
  {
    label: "Sistema (sans)",
    value:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  { label: "Georgia (serif)", value: "Georgia, 'Times New Roman', Times, serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  {
    label: "Monospace",
    value: "'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
  },
];

export { FONT_OPTIONS };

let idCounter = 0;
function nextId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  idCounter += 1;
  return `block-${idCounter}`;
}

/** Crea un bloque nuevo con valores por defecto según su tipo. */
export function createBlock(type: EmailBlockType): EmailBlock {
  const id = nextId();
  switch (type) {
    case "heading":
      return { id, type, text: "Título de la sección", level: 2, align: "left" };
    case "text":
      return {
        id,
        type,
        text: "Escribe aquí tu mensaje. Puedes usar variables como {{nombre}}.",
        align: "left",
      };
    case "image":
      return { id, type, src: "", alt: "", href: "", align: "center", width: 100 };
    case "button":
      return { id, type, label: "Ver más", href: "https://", align: "center" };
    case "divider":
      return { id, type };
    case "spacer":
      return { id, type, size: "md" };
    case "columns":
      return {
        id,
        type,
        left: "Columna izquierda.",
        right: "Columna derecha.",
      };
    case "html":
      return { id, type, code: "<p>HTML personalizado</p>" };
    default:
      return { id, type: "text", text: "", align: "left" };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Convierte texto plano (con saltos de línea y variables) a HTML de párrafos. */
function textToHtml(value: string): string {
  const safe = escapeHtml(value.trim());
  if (!safe) {
    return "";
  }
  return safe
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n/g, "<br />"))
    .join("<br /><br />");
}

/** HTML interno de un bloque (usado tanto en el lienzo como en la salida). */
export function renderBlockHtml(block: EmailBlock, settings: EmailSettings): string {
  switch (block.type) {
    case "heading": {
      const size = block.level === 1 ? 26 : block.level === 2 ? 21 : 17;
      return `<h${block.level} style="margin:0 0 14px;font-size:${size}px;line-height:1.3;font-weight:700;text-align:${block.align};color:${settings.textColor};">${escapeHtml(block.text) || "&nbsp;"}</h${block.level}>`;
    }
    case "text":
      return `<div style="margin:0 0 16px;font-size:15px;line-height:1.65;text-align:${block.align};color:${settings.textColor};">${textToHtml(block.text) || "&nbsp;"}</div>`;
    case "image": {
      if (!block.src) {
        return `<div style="margin:0 0 16px;padding:32px;text-align:center;border:1px dashed #cbd5e1;border-radius:8px;color:#94a3b8;font-size:13px;">Imagen sin URL</div>`;
      }
      const img = `<img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}" width="${block.width}%" style="width:${block.width}%;max-width:100%;border:0;border-radius:6px;display:inline-block;" />`;
      const inner = block.href
        ? `<a href="${escapeHtml(block.href)}" style="text-decoration:none;">${img}</a>`
        : img;
      return `<div style="margin:0 0 16px;text-align:${block.align};">${inner}</div>`;
    }
    case "button":
      return `<div style="margin:0 0 16px;text-align:${block.align};"><a href="${escapeHtml(block.href)}" style="display:inline-block;padding:12px 26px;background:${settings.buttonColor};color:${settings.buttonTextColor};font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">${escapeHtml(block.label) || "Botón"}</a></div>`;
    case "divider":
      return `<div style="margin:20px 0;border-top:1px solid #e5e7eb;"></div>`;
    case "spacer":
      return `<div style="height:${SPACER_PX[block.size]}px;line-height:${SPACER_PX[block.size]}px;font-size:1px;">&nbsp;</div>`;
    case "columns":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;"><tr><td valign="top" width="50%" style="padding-right:12px;font-size:15px;line-height:1.65;color:${settings.textColor};">${textToHtml(block.left) || "&nbsp;"}</td><td valign="top" width="50%" style="padding-left:12px;font-size:15px;line-height:1.65;color:${settings.textColor};">${textToHtml(block.right) || "&nbsp;"}</td></tr></table>`;
    case "html":
      return `<div style="margin:0 0 16px;">${block.code}</div>`;
    default:
      return "";
  }
}

const MARKER = /<!--dr-blocks:([A-Za-z0-9+/=]+)-->/;

function encodeDoc(doc: EmailDocument): string {
  const json = JSON.stringify(doc);
  return btoa(unescape(encodeURIComponent(json)));
}

function decodeDoc(encoded: string): EmailDocument | null {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    const parsed = JSON.parse(json) as EmailDocument;
    if (!Array.isArray(parsed.blocks)) {
      return null;
    }
    return {
      blocks: parsed.blocks,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    };
  } catch {
    return null;
  }
}

/** Serializa el documento a HTML de correo con estilos en línea y el marcador. */
export function serializeEmail(doc: EmailDocument): string {
  const { blocks, settings } = doc;
  const body = blocks
    .map((block) => renderBlockHtml(block, settings))
    .join("\n");
  const marker = `<!--dr-blocks:${encodeDoc(doc)}-->`;
  return `${marker}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${settings.pageBg};margin:0;padding:24px 0;">
  <tr>
    <td align="center">
      <table role="presentation" width="${settings.contentWidth}" cellpadding="0" cellspacing="0" style="width:${settings.contentWidth}px;max-width:100%;background:${settings.contentBg};border-radius:12px;font-family:${settings.fontFamily};color:${settings.textColor};">
        <tr>
          <td style="padding:32px;">
${body}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

/**
 * Reconstruye el documento desde un HTML previo. Si tiene el marcador de
 * bloques, lo hidrata; si es HTML sin marcador (o vacío), lo envuelve en un
 * único bloque HTML para no perder contenido.
 */
export function parseEmail(html: string): EmailDocument {
  const match = html.match(MARKER);
  if (match) {
    const decoded = decodeDoc(match[1]);
    if (decoded) {
      return decoded;
    }
  }
  if (html.trim()) {
    return {
      blocks: [{ id: nextId(), type: "html", code: html }],
      settings: { ...DEFAULT_SETTINGS },
    };
  }
  return { blocks: [], settings: { ...DEFAULT_SETTINGS } };
}

/** True si el HTML fue generado por el constructor de bloques. */
export function isBlockEmail(html: string): boolean {
  return MARKER.test(html);
}
