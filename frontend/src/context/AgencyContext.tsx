import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "dr-logistics-active-agency";

type AgencyContextValue = {
  /** Agencia (subcuenta) activa; null = "Todas las agencias". */
  activeAgencyId: string | null;
  setActiveAgencyId: (agencyId: string | null) => void;
};

const AgencyContext = createContext<AgencyContextValue | null>(null);

export function AgencyProvider({ children }: { children: ReactNode }) {
  const [activeAgencyId, setActiveAgencyIdState] = useState<string | null>(
    () =>
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(STORAGE_KEY),
  );

  const setActiveAgencyId = useCallback((agencyId: string | null) => {
    setActiveAgencyIdState(agencyId);

    if (typeof window !== "undefined") {
      if (agencyId) {
        window.localStorage.setItem(STORAGE_KEY, agencyId);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const value = useMemo(
    () => ({ activeAgencyId, setActiveAgencyId }),
    [activeAgencyId, setActiveAgencyId],
  );

  return (
    <AgencyContext.Provider value={value}>{children}</AgencyContext.Provider>
  );
}

export function useActiveAgency(): AgencyContextValue {
  const context = useContext(AgencyContext);

  if (!context) {
    throw new Error("useActiveAgency debe usarse dentro de <AgencyProvider>.");
  }

  return context;
}
