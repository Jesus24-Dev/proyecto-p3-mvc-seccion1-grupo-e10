import { useCallback, useEffect, useRef, useState } from "react";
import { ApiRequestError } from "../api";
import { useAuth } from "../context/AuthContext";
import { useActiveAgency } from "../context/AgencyContext";

/**
 * Carga los datos de una página y centraliza el manejo de errores:
 * un 401/403 cierra la sesión; el resto se expone como mensaje.
 */
export function usePageData<T>(loader: () => Promise<T>) {
  const { expireSession } = useAuth();
  // La subcuenta activa viaja como cabecera en cada petición; al cambiarla hay
  // que recargar para reflejar el nuevo alcance (vista agregada ↔ subcuenta).
  const { activeAgencyId } = useActiveAgency();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setData(await loaderRef.current());
    } catch (caughtError) {
      if (
        caughtError instanceof ApiRequestError &&
        (caughtError.statusCode === 401 || caughtError.statusCode === 403)
      ) {
        expireSession(caughtError.message);
        return;
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudieron cargar los datos.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [expireSession]);

  useEffect(() => {
    void reload();
    // Recarga también cuando cambia la subcuenta activa.
  }, [reload, activeAgencyId]);

  return { data, isLoading, error, reload };
}

/**
 * Ejecuta una mutación (crear/editar/eliminar) con el mismo tratamiento
 * de sesión expirada; devuelve el mensaje de error para mostrarlo en línea.
 */
export function useMutationHandler() {
  const { expireSession } = useAuth();

  return useCallback(
    async (mutate: () => Promise<void>): Promise<string | null> => {
      try {
        await mutate();
        return null;
      } catch (caughtError) {
        if (
          caughtError instanceof ApiRequestError &&
          (caughtError.statusCode === 401 || caughtError.statusCode === 403)
        ) {
          expireSession(caughtError.message);
          return null;
        }

        return caughtError instanceof Error
          ? caughtError.message
          : "La operación no se pudo completar.";
      }
    },
    [expireSession],
  );
}
