import type {
  Agency,
  AgencyRole,
  ApiErrorResponse,
  AuthSession,
  AgencyTheme,
  Automation,
  CreateAgencyPayload,
  CreateMembershipPayload,
  CreateOrderPayload,
  CreatePackagePayload,
  CreateUserInformationPayload,
  CreateUserPayload,
  LoginPayload,
  Membership,
  Order,
  Package,
  SaveAutomationPayload,
  UpdateAgencyPayload,
  UpdateUserInformationPayload,
  UpdateUserPayload,
  User,
  UserInformation,
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

const FALLBACK_STATUS_MESSAGES: Record<number, string> = {
  400: "La solicitud tiene datos inválidos. Revisa los campos e intenta de nuevo.",
  401: "Credenciales inválidas o sesión expirada. Inicia sesión de nuevo.",
  403: "Tu cuenta no tiene permisos para esta acción.",
  404: "El recurso solicitado no existe en el servidor.",
  409: "El registro entra en conflicto con uno existente.",
};

function buildErrorMessage(
  status: number,
  serverMessage: string | null,
): string {
  if (status >= 500) {
    return `Error del servidor (${status}). Intenta de nuevo en unos minutos.`;
  }

  return (
    serverMessage ||
    FALLBACK_STATUS_MESSAGES[status] ||
    `La solicitud falló con el código ${status}.`
  );
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

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiRequestError(
      "No se pudo conectar con el servidor. Verifica tu conexión y que la API esté disponible.",
      0,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = data as ApiErrorResponse | null;
    const serverMessage =
      error?.errors?.map((item) => item.message).join("\n") ||
      error?.message ||
      null;
    throw new ApiRequestError(
      buildErrorMessage(response.status, serverMessage),
      response.status,
    );
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
  update: (id: string, payload: UpdateAgencyPayload) =>
    request<Agency>(`/agencies/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  updateTheme: (id: string, theme: AgencyTheme | null) =>
    request<Agency>(`/agencies/${id}/theme`, {
      method: "PUT",
      body: JSON.stringify({ theme }),
    }),
  remove: (id: string) =>
    request<void>(`/agencies/${id}`, {
      method: "DELETE",
    }),
};

export const ordersApi = {
  list: () => request<Order[]>("/orders"),
  create: (payload: CreateOrderPayload) =>
    request<Order>("/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: CreateOrderPayload) =>
    request<Order>(`/orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    request<void>(`/orders/${id}`, {
      method: "DELETE",
    }),
};

export const packagesApi = {
  list: () => request<Package[]>("/packages"),
  create: (payload: CreatePackagePayload) =>
    request<Package>("/packages", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: CreatePackagePayload) =>
    request<Package>(`/packages/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    request<void>(`/packages/${id}`, {
      method: "DELETE",
    }),
};

export const contactsApi = {
  list: () => request<UserInformation[]>("/info"),
  create: (payload: CreateUserInformationPayload) =>
    request<UserInformation>("/info", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (userId: string, payload: UpdateUserInformationPayload) =>
    request<UserInformation>(`/info/${userId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  remove: (userId: string) =>
    request<void>(`/info/${userId}`, {
      method: "DELETE",
    }),
};

export const membershipsApi = {
  list: (agencyId?: string) =>
    request<Membership[]>(
      agencyId ? `/memberships?agency_id=${agencyId}` : "/memberships",
    ),
  create: (payload: CreateMembershipPayload) =>
    request<Membership>("/memberships", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateRole: (id: string, role: AgencyRole) =>
    request<Membership>(`/memberships/${id}`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    }),
  remove: (id: string) =>
    request<void>(`/memberships/${id}`, {
      method: "DELETE",
    }),
};

export const automationsApi = {
  list: () => request<Automation[]>("/automations"),
  get: (id: string) => request<Automation>(`/automations/${id}`),
  create: (payload: SaveAutomationPayload) =>
    request<Automation>("/automations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: SaveAutomationPayload) =>
    request<Automation>(`/automations/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    request<void>(`/automations/${id}`, {
      method: "DELETE",
    }),
  triggerWebhook: (id: string, payload?: unknown) =>
    request<{ status?: string; steps?: Array<{ kind?: string }> }>(
      `/hooks/automations/${id}`,
      {
        method: "POST",
        body: JSON.stringify(payload ?? {}),
      },
      false,
    ),
};
