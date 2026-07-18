import type { AgencyTheme } from "../types";

/**
 * Presets de acento para el configurador de apariencia por subcuenta.
 * Cada uno trae el par claro/oscuro del color primario en OKLCH y el
 * color de texto sobre ese primario, para aplicarse como variables CSS.
 */
export type AccentPreset = {
  id: string;
  label: string;
  /** Muestra para el selector. */
  swatch: string;
  light: { primary: string; primaryForeground: string; ring: string };
  dark: { primary: string; primaryForeground: string; ring: string };
};

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    id: "domesa",
    label: "Rojo Domesa",
    swatch: "#cf2338",
    light: {
      primary: "oklch(0.55 0.2 21)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.55 0.2 21)",
    },
    dark: {
      primary: "oklch(0.62 0.2 21)",
      primaryForeground: "oklch(0.145 0 0)",
      ring: "oklch(0.62 0.2 21)",
    },
  },
  {
    id: "navy",
    label: "Azul despacho",
    swatch: "#1d4e89",
    light: {
      primary: "oklch(0.45 0.13 255)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.45 0.13 255)",
    },
    dark: {
      primary: "oklch(0.62 0.14 255)",
      primaryForeground: "oklch(0.145 0 0)",
      ring: "oklch(0.62 0.14 255)",
    },
  },
  {
    id: "emerald",
    label: "Verde entrega",
    swatch: "#0e8a54",
    light: {
      primary: "oklch(0.52 0.13 158)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.52 0.13 158)",
    },
    dark: {
      primary: "oklch(0.65 0.14 158)",
      primaryForeground: "oklch(0.145 0 0)",
      ring: "oklch(0.65 0.14 158)",
    },
  },
  {
    id: "violet",
    label: "Violeta",
    swatch: "#6d3bd4",
    light: {
      primary: "oklch(0.52 0.2 292)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.52 0.2 292)",
    },
    dark: {
      primary: "oklch(0.66 0.19 292)",
      primaryForeground: "oklch(0.145 0 0)",
      ring: "oklch(0.66 0.19 292)",
    },
  },
  {
    id: "amber",
    label: "Ámbar",
    swatch: "#b4690e",
    light: {
      primary: "oklch(0.6 0.14 65)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.6 0.14 65)",
    },
    dark: {
      primary: "oklch(0.72 0.15 65)",
      primaryForeground: "oklch(0.145 0 0)",
      ring: "oklch(0.72 0.15 65)",
    },
  },
];

/** Escalas de tamaño de fuente/interfaz (multiplican el font-size raíz). */
export type FontScale = { id: string; label: string; scale: number };

export const FONT_SCALES: FontScale[] = [
  { id: "sm", label: "Compacto", scale: 0.92 },
  { id: "base", label: "Normal", scale: 1 },
  { id: "lg", label: "Cómodo", scale: 1.08 },
  { id: "xl", label: "Grande", scale: 1.16 },
];

/** Tintes sutiles del fondo de la aplicación por subcuenta. */
export type BackgroundPreset = {
  id: string;
  label: string;
  swatch: string;
  /** "" = usa el fondo base (sin override). */
  light: string;
  dark: string;
};

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  { id: "paper", label: "Papel", swatch: "#faf9f7", light: "", dark: "" },
  {
    id: "warm",
    label: "Cálido",
    swatch: "#f5efe6",
    light: "oklch(0.972 0.012 80)",
    dark: "oklch(0.17 0.008 70)",
  },
  {
    id: "cool",
    label: "Frío",
    swatch: "#eef2f7",
    light: "oklch(0.972 0.008 250)",
    dark: "oklch(0.17 0.01 255)",
  },
  {
    id: "slate",
    label: "Pizarra",
    swatch: "#eceef1",
    light: "oklch(0.965 0.002 260)",
    dark: "oklch(0.16 0.004 260)",
  },
];

export const DEFAULT_THEME: AgencyTheme = {
  accent: "domesa",
  radius: 0.625,
  fontScale: "base",
  background: "paper",
};

export function accentPreset(id: string): AccentPreset {
  return ACCENT_PRESETS.find((preset) => preset.id === id) ?? ACCENT_PRESETS[0];
}

export function fontScale(id: string | undefined): FontScale {
  return FONT_SCALES.find((f) => f.id === id) ?? FONT_SCALES[1];
}

export function backgroundPreset(id: string | undefined): BackgroundPreset {
  return (
    BACKGROUND_PRESETS.find((b) => b.id === id) ?? BACKGROUND_PRESETS[0]
  );
}

/**
 * Aplica el acento y el radio de un tema a las variables CSS del documento.
 * Pasa theme=null para restaurar los valores base de la marca.
 */
export function applyAgencyTheme(theme: AgencyTheme | null, isDark: boolean) {
  const root = document.documentElement;
  const preset = accentPreset(theme?.accent ?? DEFAULT_THEME.accent);
  const tokens = isDark ? preset.dark : preset.light;

  root.style.setProperty("--primary", tokens.primary);
  root.style.setProperty("--primary-foreground", tokens.primaryForeground);
  root.style.setProperty("--ring", tokens.ring);
  root.style.setProperty("--sidebar-primary", tokens.primary);
  root.style.setProperty("--sidebar-ring", tokens.ring);
  root.style.setProperty(
    "--radius",
    `${theme?.radius ?? DEFAULT_THEME.radius}rem`,
  );

  // Tamaño de fuente/interfaz: escala el font-size raíz (afecta los rem).
  const font = fontScale(theme?.fontScale);
  root.style.fontSize = font.scale === 1 ? "" : `${(font.scale * 100).toFixed(2)}%`;

  // Fondo de la app: tinte sutil (o base si es "papel"/default).
  const bg = backgroundPreset(theme?.background);
  const bgValue = isDark ? bg.dark : bg.light;
  if (bgValue) {
    root.style.setProperty("--background", bgValue);
    root.style.setProperty("--sidebar", bgValue);
  } else {
    root.style.removeProperty("--background");
    root.style.removeProperty("--sidebar");
  }
}
