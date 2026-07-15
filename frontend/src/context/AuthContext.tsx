import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ApiRequestError,
  authApi,
  clearStoredSession,
  getStoredSession,
  setStoredSession,
} from "../api";
import type { AuthSession, LoginPayload } from "../types";

type AuthContextValue = {
  session: AuthSession | null;
  /** Mensaje mostrado en el login cuando la sesión se cerró por expiración. */
  sessionNotice: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
  /** Cierra sesión ante un 401/403 de la API y conserva el motivo. */
  expireSession: (message?: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() =>
    getStoredSession(),
  );
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  const login = useCallback(async (payload: LoginPayload) => {
    const nextSession = await authApi.login(payload);

    if (nextSession.user.role !== "ADMIN") {
      throw new ApiRequestError(
        "Necesitas una cuenta ADMIN para entrar al panel.",
        403,
      );
    }

    setStoredSession(nextSession);
    setSession(nextSession);
    setSessionNotice(null);
  }, []);

  const logout = useCallback(() => {
    clearStoredSession();
    setSession(null);
    setSessionNotice(null);
  }, []);

  const expireSession = useCallback(
    (message = "Tu sesión ya no es válida. Inicia sesión de nuevo.") => {
      clearStoredSession();
      setSession(null);
      setSessionNotice(message);
    },
    [],
  );

  const value = useMemo(
    () => ({ session, sessionNotice, login, logout, expireSession }),
    [session, sessionNotice, login, logout, expireSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>.");
  }

  return context;
}
