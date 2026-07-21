import type {
  AddCheckpointPayload,
  Agency,
  AgencyRole,
  ApiErrorResponse,
  AuthSession,
  AgencyTheme,
  Automation,
  AutomationDefinition,
  AutomationRun,
  ContactRun,
  CreateAgencyPayload,
  CreateMembershipPayload,
  CreateOrderPayload,
  CreatePackagePayload,
  CreateEmailDomainPayload,
  CreateEmailTemplatePayload,
  CreateTagPayload,
  CreateUserInformationPayload,
  AppNotification,
  AppRole,
  AuditLog,
  ClientNote,
  CreateRolePayload,
  SystemConfig,
  UpdateConfigPayload,
  UpdateRolePayload,
  CreateClientNotePayload,
  CreatedUser,
  CreatePaymentPayload,
  CreateUserPayload,
  Payment,
  DashboardWidgetLayout,
  EmailDomain,
  EmailTemplate,
  LoginPayload,
  Membership,
  Order,
  Package,
  PipelineStage,
  CreateStagePayload,
  UpdateStagePayload,
  PublicTracking,
  SaveAutomationPayload,
  SaveSmartListPayload,
  SmartList,
  Tag,
  TrackingResponse,
  UpdateAgencyPayload,
  UpdateEmailTemplatePayload,
  UpdateTagPayload,
  UpdateUserInformationPayload,
  UpdateUserPayload,
  User,
  UserInformation,
  TrashedContact,
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

    // Subcuenta activa: el backend acota los datos a esta agencia (vista de
    // subcuenta). Sin cabecera = vista agregada (todas las agencias permitidas).
    if (typeof window !== "undefined") {
      const activeAgency = window.localStorage.getItem(
        "dr-logistics-active-agency",
      );
      if (activeAgency) {
        headers.set("X-Active-Agency", activeAgency);
      }
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
  verifyEmail: (token: string) =>
    request<{ email: string }>(
      "/auth/verify-email",
      { method: "POST", body: JSON.stringify({ token }) },
      false,
    ),
  resendVerification: (email: string) =>
    request<{ verification_token: string | null; already_verified: boolean }>(
      "/auth/resend-verification",
      { method: "POST", body: JSON.stringify({ email }) },
      false,
    ),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ status: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    }),
  forgotPassword: (email: string) =>
    request<{ reset_token: string | null }>(
      "/auth/forgot-password",
      { method: "POST", body: JSON.stringify({ email }) },
      false,
    ),
  resetPassword: (token: string, newPassword: string) =>
    request<{ status: string }>(
      "/auth/reset-password",
      { method: "POST", body: JSON.stringify({ token, new_password: newPassword }) },
      false,
    ),
  requestMagicLink: (email: string) =>
    request<{ sent: boolean }>(
      "/auth/magic-link",
      { method: "POST", body: JSON.stringify({ email }) },
      false,
    ),
  magicLogin: (token: string) =>
    request<AuthSession>(
      "/auth/magic-login",
      { method: "POST", body: JSON.stringify({ token }) },
      false,
    ),
};

export const usersApi = {
  list: () => request<User[]>("/users"),
  create: (payload: CreateUserPayload) =>
    request<CreatedUser>("/users", {
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
  updateDashboard: (id: string, layout: DashboardWidgetLayout[] | null) =>
    request<Agency>(`/agencies/${id}/dashboard`, {
      method: "PUT",
      body: JSON.stringify({ layout }),
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
  getByTracking: (code: string) =>
    request<TrackingResponse>(`/packages/tracking/${encodeURIComponent(code)}`),
  addEvent: (id: string, payload: AddCheckpointPayload) =>
    request<TrackingResponse>(`/packages/${id}/events`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  moveStage: (id: string, stageId: string) =>
    request<Package>(`/packages/${id}/stage`, {
      method: "PUT",
      body: JSON.stringify({ stage_id: stageId }),
    }),
  // Eliminar un movimiento del recorrido (solo superadmin).
  deleteEvent: (id: string, eventId: string) =>
    request<TrackingResponse>(`/packages/${id}/events/${eventId}`, {
      method: "DELETE",
    }),
  remove: (id: string) =>
    request<void>(`/packages/${id}`, {
      method: "DELETE",
    }),
};

export const pipelineStagesApi = {
  list: () => request<PipelineStage[]>("/pipeline-stages"),
  create: (payload: CreateStagePayload) =>
    request<PipelineStage>("/pipeline-stages", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: UpdateStagePayload) =>
    request<PipelineStage>(`/pipeline-stages/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  reorder: (ids: string[]) =>
    request<PipelineStage[]>("/pipeline-stages/reorder", {
      method: "PUT",
      body: JSON.stringify({ ids }),
    }),
  remove: (id: string) =>
    request<void>(`/pipeline-stages/${id}`, { method: "DELETE" }),
};

// Rastreo público: sin token de administrador (includeAuth = false).
export const trackingApi = {
  get: (code: string) =>
    request<PublicTracking>(
      `/tracking/${encodeURIComponent(code)}`,
      undefined,
      false,
    ),
};

export const aiApi = {
  email: (prompt: string) =>
    request<{ subject: string; body: string }>("/ai/email", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    }),
  workflow: (prompt: string) =>
    request<{ name: string; definition: AutomationDefinition }>("/ai/workflow", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    }),
};

export const emailTemplatesApi = {
  list: () => request<EmailTemplate[]>("/email-templates"),
  create: (payload: CreateEmailTemplatePayload) =>
    request<EmailTemplate>("/email-templates", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: UpdateEmailTemplatePayload) =>
    request<EmailTemplate>(`/email-templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    request<void>(`/email-templates/${id}`, { method: "DELETE" }),
};

export const emailDomainsApi = {
  list: () => request<EmailDomain[]>("/email-domains"),
  create: (payload: CreateEmailDomainPayload) =>
    request<EmailDomain>("/email-domains", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  verify: (id: string) =>
    request<EmailDomain>(`/email-domains/${id}/verify`, { method: "POST" }),
  remove: (id: string) =>
    request<void>(`/email-domains/${id}`, { method: "DELETE" }),
};

export const tagsApi = {
  list: () => request<Tag[]>("/tags"),
  create: (payload: CreateTagPayload) =>
    request<Tag>("/tags", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: UpdateTagPayload) =>
    request<Tag>(`/tags/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    request<void>(`/tags/${id}`, {
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
  // Eliminación definitiva (solo superadmin): borra el contacto con sus
  // paquetes, pagos y notas. Irreversible.
  remove: (userId: string) =>
    request<void>(`/info/${userId}`, {
      method: "DELETE",
    }),
  // Papelera (solo superadmin).
  listTrashed: () => request<TrashedContact[]>("/info/trash"),
  trash: (userId: string) =>
    request<void>(`/info/${userId}/trash`, { method: "POST" }),
  restore: (userId: string) =>
    request<void>(`/info/${userId}/restore`, { method: "POST" }),
  // Etiquetas del contacto (por su id de contacto, no user_id).
  addTag: (contactId: string, tag: string) =>
    request<{ tags: string[] }>(`/info/${contactId}/tags`, {
      method: "POST",
      body: JSON.stringify({ tag }),
    }),
  removeTag: (contactId: string, tag: string) =>
    request<{ tags: string[] }>(
      `/info/${contactId}/tags/${encodeURIComponent(tag)}`,
      { method: "DELETE" },
    ),
};

export const smartListsApi = {
  list: () => request<SmartList[]>("/smart-lists"),
  create: (payload: SaveSmartListPayload) =>
    request<SmartList>("/smart-lists", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: SaveSmartListPayload) =>
    request<SmartList>(`/smart-lists/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    request<void>(`/smart-lists/${id}`, { method: "DELETE" }),
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
  // Ejecución manual: inscribe un contacto (o una muestra) y lo hace recorrer
  // el flujo en vivo.
  run: (id: string, contactId?: string) =>
    request<{ run_id: string }>(`/automations/${id}/run`, {
      method: "POST",
      body: JSON.stringify(contactId ? { contact_id: contactId } : {}),
    }),
  runs: (id: string) => request<AutomationRun[]>(`/automations/${id}/runs`),
  // Reintenta una ejecución: "full" (reinscribe) o "failed" (pasos fallidos).
  retryRun: (id: string, runId: string, mode: "full" | "failed") =>
    request<{ run_id: string; retried: number | null }>(
      `/automations/${id}/runs/${runId}/retry`,
      { method: "POST", body: JSON.stringify({ mode }) },
    ),
  // Inscripciones de un contacto en cualquier flujo, para su ficha.
  runsByContact: (contactId: string) =>
    request<ContactRun[]>(`/automations/contact/${contactId}/runs`),
  // URL del stream SSE. EventSource no envía cabeceras, así que el token va
  // como query param (lo valida requireAdminQueryToken en el backend).
  streamUrl: (id: string) => {
    const token = getStoredSession()?.token ?? "";
    return `${API_URL}/automations/${id}/stream?token=${encodeURIComponent(token)}`;
  },
};

export const paymentsApi = {
  list: () => request<Payment[]>("/payments"),
  create: (payload: CreatePaymentPayload) =>
    request<Payment>("/payments", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  validate: (id: string) =>
    request<Payment>(`/payments/${id}/validate`, { method: "POST" }),
  reject: (id: string) =>
    request<Payment>(`/payments/${id}/reject`, { method: "POST" }),
  remove: (id: string) =>
    request<void>(`/payments/${id}`, { method: "DELETE" }),
};

export const auditApi = {
  list: () => request<AuditLog[]>("/audit"),
};

export const rolesApi = {
  list: () => request<AppRole[]>("/roles"),
  create: (payload: CreateRolePayload) =>
    request<AppRole>("/roles", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: UpdateRolePayload) =>
    request<AppRole>(`/roles/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  remove: (id: string) => request<void>(`/roles/${id}`, { method: "DELETE" }),
};

export const configApi = {
  get: () => request<SystemConfig>("/config"),
  update: (payload: UpdateConfigPayload) =>
    request<SystemConfig>("/config", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
};

export const notificationsApi = {
  list: () => request<AppNotification[]>("/notifications"),
  markRead: (id: string) =>
    request<{ status: string }>(`/notifications/${id}/read`, {
      method: "POST",
    }),
  markAllRead: () =>
    request<{ status: string }>("/notifications/read-all", { method: "POST" }),
};

export const clientNotesApi = {
  list: (contactId: string) =>
    request<ClientNote[]>(`/client-notes?contact_id=${contactId}`),
  create: (payload: CreateClientNotePayload) =>
    request<ClientNote>("/client-notes", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    request<void>(`/client-notes/${id}`, { method: "DELETE" }),
};
