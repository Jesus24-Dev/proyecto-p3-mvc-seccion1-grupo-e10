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

export const DEFAULT_THEME: AgencyTheme = { accent: "domesa", radius: 0.625 };

export function accentPreset(id: string): AccentPreset {
  return ACCENT_PRESETS.find((preset) => preset.id === id) ?? ACCENT_PRESETS[0];
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
}
