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

// Roles con acceso al panel de personal: administrador de agencia
// (ADMIN/SUPERADMIN, ve todo) y administrador de sede (DISTRIBUTOR, acotado).
const STAFF_ROLES = new Set(["ADMIN", "SUPERADMIN", "DISTRIBUTOR"]);

type AuthContextValue = {
  session: AuthSession | null;
  /** Mensaje mostrado en el login cuando la sesión se cerró por expiración. */
  sessionNotice: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  /** Inicia sesión con una sesión ya obtenida (p. ej. enlace mágico). */
  loginWithSession: (session: AuthSession) => void;
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

    if (!STAFF_ROLES.has(nextSession.user.role)) {
      throw new ApiRequestError(
        "Necesitas una cuenta de personal para entrar al panel.",
        403,
      );
    }

    setStoredSession(nextSession);
    setSession(nextSession);
    setSessionNotice(null);
  }, []);

  const loginWithSession = useCallback((nextSession: AuthSession) => {
    if (!STAFF_ROLES.has(nextSession.user.role)) {
      throw new ApiRequestError(
        "Necesitas una cuenta de personal para entrar al panel.",
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
    () => ({
      session,
      sessionNotice,
      login,
      loginWithSession,
      logout,
      expireSession,
    }),
    [session, sessionNotice, login, loginWithSession, logout, expireSession],
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
