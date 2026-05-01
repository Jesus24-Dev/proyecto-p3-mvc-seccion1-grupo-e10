import type {
  Agency,
  ApiErrorResponse,
  AuthSession,
  CreateAgencyPayload,
  CreateUserPayload,
  LoginPayload,
  UpdateUserPayload,
  User,
} from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "";
const SESSION_STORAGE_KEY = "dr-logistics-admin-session";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AuthSession>;

  return (
    typeof candidate.token === "string" &&
    Boolean(candidate.user) &&
    typeof candidate.user?.id === "string" &&
    typeof candidate.user?.email === "string" &&
    typeof candidate.user?.role === "string"
  );
}

export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedSession = window.localStorage.getItem(SESSION_STORAGE_KEY);

  if (!storedSession) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(storedSession) as unknown;

    if (!isAuthSession(parsedSession)) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return parsedSession;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function setStoredSession(session: AuthSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

async function request<T>(
  path: string,
  options?: RequestInit,
  includeAuth = true,
): Promise<T> {
  const headers = new Headers(options?.headers);

  if (!(options?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (includeAuth) {
    const session = getStoredSession();

    if (session?.token) {
      headers.set("Authorization", `Bearer ${session.token}`);
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = data as ApiErrorResponse | null;
    const message =
      error?.errors?.map((item) => item.message).join("\n") ||
      error?.message ||
      "Request failed";
    throw new ApiRequestError(message, response.status);
  }

  return data as T;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    request<AuthSession>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      false,
    ),
};

export const usersApi = {
  list: () => request<User[]>("/users"),
  create: (payload: CreateUserPayload) =>
    request<User>("/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: UpdateUserPayload) =>
    request<User>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    request<void>(`/users/${id}`, {
      method: "DELETE",
    }),
};

export const agenciesApi = {
  list: () => request<Agency[]>("/agencies"),
  create: (payload: CreateAgencyPayload) =>
    request<Agency>("/agencies", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
