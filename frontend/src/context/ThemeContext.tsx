import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AgencyTheme } from "../types";
import { applyAgencyTheme } from "../lib/themes";

const MODE_KEY = "dr-logistics-color-mode";

type ColorMode = "light" | "dark";

type ThemeContextValue = {
  mode: ColorMode;
  toggleMode: () => void;
  /** Tema de la subcuenta activa; null = apariencia base de la marca. */
  agencyTheme: AgencyTheme | null;
  setAgencyTheme: (theme: AgencyTheme | null) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function initialMode(): ColorMode {
  if (typeof window === "undefined") {
    return "light";
  }
  const stored = window.localStorage.getItem(MODE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ColorMode>(initialMode);
  const [agencyTheme, setAgencyTheme] = useState<AgencyTheme | null>(null);

  // Alterna la clase .dark y reaplica el acento en cada cambio de modo o tema.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", mode === "dark");
    window.localStorage.setItem(MODE_KEY, mode);
    applyAgencyTheme(agencyTheme, mode === "dark");
  }, [mode, agencyTheme]);

  const toggleMode = useCallback(() => {
    setMode((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo(
    () => ({ mode, toggleMode, agencyTheme, setAgencyTheme }),
    [mode, toggleMode, agencyTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme debe usarse dentro de <ThemeProvider>.");
  }

  return context;
}
