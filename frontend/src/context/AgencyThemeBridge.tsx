import { useEffect } from "react";
import { agenciesApi } from "../api";
import { useActiveAgency } from "./AgencyContext";
import { useAuth } from "./AuthContext";
import { useTheme } from "./ThemeContext";

/**
 * Sincroniza el tema de la subcuenta activa con el ThemeProvider: cuando
 * cambia la agencia activa, carga su tema guardado y lo aplica; en "Todas
 * las agencias" vuelve a la apariencia base de la marca.
 */
export function AgencyThemeBridge() {
  const { session } = useAuth();
  const { activeAgencyId } = useActiveAgency();
  const { setAgencyTheme } = useTheme();

  useEffect(() => {
    if (!session) {
      setAgencyTheme(null);
      return;
    }

    if (!activeAgencyId) {
      setAgencyTheme(null);
      return;
    }

    let isCancelled = false;

    agenciesApi
      .list()
      .then((agencies) => {
        if (isCancelled) {
          return;
        }
        const active = agencies.find((agency) => agency.id === activeAgencyId);
        setAgencyTheme(active?.theme ?? null);
      })
      .catch(() => {
        if (!isCancelled) {
          setAgencyTheme(null);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [session, activeAgencyId, setAgencyTheme]);

  return null;
}
