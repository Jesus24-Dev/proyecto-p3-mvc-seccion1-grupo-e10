export type UserRole = "USER" | "ADMIN" | "DISTRIBUTOR" | "SUPERADMIN";

export interface User {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserPayload {
  email: string;
  /** Opcional: si se omite, la contraseña actual se mantiene. */
  password?: string;
  /** Opcional: cambiar el rol global de la cuenta. */
  role?: UserRole;
}

export interface AgencyTheme {
  /** Nombre del preset de acento (ver lib/themes). */
  accent: string;
  /** Radio base en rem. */
  radius: number;
  /** Escala de tamaño de fuente/interfaz (id de FONT_SCALES). */
  fontScale?: string;
  /** Tinte del fondo de la app (id de BACKGROUND_PRESETS). */
  background?: string;
}

export interface Agency {
  id: string;
  name: string;
  location: string;
  is_active: boolean;
  user_id: string;
  latitude: number | null;
  longitude: number | null;
  theme: AgencyTheme | null;
  dashboard_layout: DashboardWidgetLayout[] | null;
}

/** Posición/tamaño de un widget en el panel editable. */
export interface DashboardWidgetLayout {
  id: string;
  colSpan: number;
  rowSpan: number;
  order: number;
  hidden: boolean;
}

export interface CreateAgencyPayload {
  name: string;
  location: string;
  user_id: string;
}

export interface UpdateAgencyPayload {
  name?: string;
  location?: string;
  user_id?: string;
  is_active?: boolean;
}

export type TransferStatus =
  | "CREATED"
  | "PENDING_PAYMENT"
  | "IN_REVIEW"
  | "PROCESSING"
  | "READY_FOR_PICKUP"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED"
  | "REFUNDED";

export interface Order {
  id: string;
  user_id: string;
  date_arrived: string;
  date_received: string;
  origin_agency_id: string;
  destination_agency_id: string;
  description: string;
  amount: number;
  status: TransferStatus;
}

export interface CreateOrderPayload {
  user_id: string;
  date_arrived: string;
  date_received: string;
  origin_agency_id: string;
  destination_agency_id: string;
  description: string;
  amount: number;
  status?: TransferStatus;
}

export interface UserInformation {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  document_id: string;
  phone: string;
  address: string;
  birthday: string;
  created_at: string;
  tags: string[];
  /** Fecha en que se envió a la papelera (soft-delete); null/ausente = activo. */
  deleted_at?: string | null;
  /** Agencia (subcuenta) dueña del contacto. Todo contacto pertenece a una. */
  agency_id: string | null;
  agency: { id: string; name: string } | null;
}

/** Contacto en la papelera + cuánto arrastra su eliminación definitiva. */
export interface TrashedContact extends UserInformation {
  deleted_at: string;
  _count: { packages: number; transactions: number };
}

export interface CreateUserInformationPayload {
  // Opcional: vincular a una cuenta existente. Si se omite, el backend crea
  // una cuenta de respaldo (contacto suelto).
  user_id?: string;
  // Opcional: correo del contacto (para la cuenta de respaldo).
  email?: string;
  // Agencia (subcuenta) dueña del contacto. Se envía la subcuenta activa.
  agency_id?: string;
  first_name: string;
  last_name: string;
  document_id?: string;
  phone?: string;
  address: string;
  birthday: string;
}

export type UpdateUserInformationPayload = Omit<
  CreateUserInformationPayload,
  "user_id" | "email"
>;

export type PackageStatus =
  | "RECEIVED"
  | "IN_TRANSIT"
  | "IN_WAREHOUSE"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "RETURNED";

export interface Package {
  id: string;
  tracking_code: string;
  description: string;
  weight_kg: number;
  dimensions: string;
  status: PackageStatus;
  image_urls: string[];
  created_at: string;
  contact_id: string;
  order_id: string | null;
  stage_id: string | null;
}

export interface CreatePackagePayload {
  description: string;
  weight_kg: number;
  dimensions?: string;
  contact_id: string;
  order_id?: string;
  status?: PackageStatus;
  image_urls?: string[];
}

/** Etapa del pipeline (estado logístico personalizable). */
export interface PipelineStage {
  id: string;
  name: string;
  color: string;
  position: number;
  is_active: boolean;
  is_system: boolean;
  status: PackageStatus | null;
}

export interface CreateStagePayload {
  name: string;
  color?: string;
}

export interface UpdateStagePayload {
  name?: string;
  color?: string;
  is_active?: boolean;
}

/** Agencia (ubicación) resumida de un checkpoint. */
export interface TrackingAgency {
  id: string;
  name: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
}

/** Un movimiento del paquete en su recorrido. */
export interface PackageEvent {
  id: string;
  status: PackageStatus;
  note: string;
  created_at: string;
  agency: TrackingAgency | null;
}

/** Rastreo completo (admin): paquete + contacto + recorrido. */
export interface TrackingResponse {
  id: string;
  tracking_code: string;
  description: string;
  weight_kg: number;
  status: PackageStatus;
  image_urls: string[];
  created_at: string;
  contact_id: string;
  order_id: string | null;
  contact: { id: string; first_name: string; last_name: string } | null;
  events: PackageEvent[];
}

/** Rastreo público: sin datos del contacto. */
export interface PublicTracking {
  tracking_code: string;
  description: string;
  weight_kg: number;
  status: PackageStatus;
  created_at: string;
  events: PackageEvent[];
}

/** Registrar un movimiento manual en el recorrido. */
export interface AddCheckpointPayload {
  status: PackageStatus;
  agency_id?: string;
  note?: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  agency_id: string;
  created_at: string;
  updated_at: string;
}

export interface AppRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
  created_at: string;
}

export interface CreateRolePayload {
  name: string;
  description?: string;
  permissions?: string[];
}

export type UpdateRolePayload = Partial<CreateRolePayload>;

export interface SystemConfig {
  id: string;
  company_name: string;
  company_rif: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  sender_email: string;
  support_email: string;
  bank_api_key: string;
  ml_api_key: string;
  /** Tasa de cambio manual Bs/USD (bolívares por 1 USD). 0 = sin configurar. */
  bs_rate: number;
  updated_at: string;
}

export type UpdateConfigPayload = Partial<
  Omit<SystemConfig, "id" | "updated_at">
>;

export type NotificationKind =
  | "PAYMENT"
  | "PACKAGE"
  | "STATE"
  | "DELIVERY"
  | "GENERAL";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  read: boolean;
  entity_id: string | null;
  created_at: string;
}

export type NoteKind = "NOTE" | "OBSERVATION" | "INCIDENT";

export interface ClientNote {
  id: string;
  kind: NoteKind;
  body: string;
  author_email: string;
  created_at: string;
  contact_id: string;
}

export interface CreateClientNotePayload {
  contact_id: string;
  kind?: NoteKind;
  body: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: string;
  user_id: string | null;
  user_email: string;
  created_at: string;
}

export type PaymentStatus = "PENDING" | "APPROVED" | "REJECTED";
export type PaymentMethod = "TRANSFER" | "MOBILE_PAYMENT" | "CASH";
export type PaymentKind = "PREPAID" | "COLLECT";

export interface Payment {
  id: string;
  reference: string;
  bank: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  kind: PaymentKind;
  paid_at: string;
  validated_at: string | null;
  note: string;
  created_at: string;
  contact_id: string;
  order_id: string | null;
  package_id: string | null;
  contact: { id: string; first_name: string; last_name: string } | null;
  order: { id: string; description: string } | null;
  package: { id: string; tracking_code: string; description: string } | null;
}

export interface CreatePaymentPayload {
  reference?: string;
  bank?: string;
  amount: number;
  paid_at: string;
  contact_id: string;
  order_id?: string;
  package_id?: string;
  method: PaymentMethod;
  kind: PaymentKind;
  note?: string;
}

/** Usuario recién creado: incluye el token para armar el enlace de verificación. */
export interface CreatedUser {
  id: string;
  email: string;
  role: UserRole;
  verification_token: string | null;
}

export interface CreateTagPayload {
  name: string;
  color?: string;
  agency_id: string;
}

export interface UpdateTagPayload {
  name: string;
  color?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  agency_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEmailTemplatePayload {
  name: string;
  subject?: string;
  body?: string;
  agency_id: string;
}

export interface UpdateEmailTemplatePayload {
  name: string;
  subject?: string;
  body?: string;
}

export type EmailDomainStatus = "PENDING" | "VERIFIED";

export interface EmailDomain {
  id: string;
  domain: string;
  status: EmailDomainStatus;
  agency_id: string;
  created_at: string;
}

export interface CreateEmailDomainPayload {
  domain: string;
  agency_id: string;
}

export type AgencyRole = "OWNER" | "MANAGER" | "OPERATOR" | "VIEWER";

export interface Membership {
  id: string;
  agency_id: string;
  user_id: string;
  role: AgencyRole;
  created_at: string;
}

export interface CreateMembershipPayload {
  agency_id: string;
  user_id: string;
  role?: AgencyRole;
}

export interface AutomationDefinition {
  nodes: Array<Record<string, unknown>>;
  edges: Array<Record<string, unknown>>;
  /** Variables personalizadas del flujo, insertables como {{token}}. */
  variables?: string[];
  /** Ajustes globales del flujo (dominio de envío, número de WhatsApp). */
  settings?: {
    email_from_domain?: string;
    whatsapp_from?: string;
    /** Permite que un contacto se inscriba de nuevo aunque ya esté en curso. */
    allow_reentry?: boolean;
    /** Proveedor de IA para el paso "Generar con IA": openai | anthropic. */
    ai_provider?: string;
    ai_model?: string;
    /** Clave de API del proveedor de IA (se inyecta por flujo). */
    ai_api_key?: string;
  };
}

export interface Automation {
  id: string;
  name: string;
  description: string;
  folder: string;
  is_active: boolean;
  definition: AutomationDefinition;
  created_at: string;
  updated_at: string;
}

export interface SaveAutomationPayload {
  name: string;
  description?: string;
  folder?: string;
  is_active?: boolean;
  definition: AutomationDefinition;
}

/** Estado de una ejecución (inscripción) de un contacto en un flujo. */
export type AutomationRunStatus =
  | "RUNNING"
  | "WAITING"
  | "COMPLETED"
  | "EXITED"
  | "FAILED";

/** Resultado de un paso ejecutado, para el registro de ejecución. */
export type AutomationEventResult = "OK" | "ERROR" | "INFO";

export interface AutomationRunEvent {
  id: string;
  run_id: string;
  /** Nodo del lienzo ejecutado. */
  node_id: string;
  /** StepKind del nodo (trigger, wait, send_whatsapp, ...). */
  kind: string;
  result: AutomationEventResult;
  detail: string;
  created_at: string;
}

export interface AutomationRun {
  id: string;
  automation_id: string;
  contact_id: string | null;
  contact_name: string;
  status: AutomationRunStatus;
  /** Nodo donde está parado el contacto (para pintarlo en el lienzo). */
  current_node_id: string | null;
  trigger: string;
  started_at: string;
  updated_at: string;
  events: AutomationRunEvent[];
}

/** Mensaje del stream SSE de ejecución en vivo. */
export interface AutomationStreamUpdate {
  automationId: string;
  run: Omit<AutomationRun, "events">;
  event?: AutomationRunEvent;
}

/** Inscripción de un contacto vista desde su ficha (incluye el nombre del flujo). */
export interface ContactRun {
  id: string;
  automation_id: string;
  automation_name: string;
  status: AutomationRunStatus;
  current_node_id: string | null;
  trigger: string;
  started_at: string;
  updated_at: string;
  events: AutomationRunEvent[];
}

/** Condición de una lista inteligente (segmento de contactos). */
export interface SmartListCondition {
  /** email | phone | document | address | tag */
  field: string;
  /** set | not_set | has | not_has */
  op: string;
  value?: string;
}

export interface SmartList {
  id: string;
  name: string;
  conditions: SmartListCondition[];
  created_at: string;
  updated_at: string;
}

export interface SaveSmartListPayload {
  name: string;
  conditions: SmartListCondition[];
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  status: "error";
  message?: string;
  errors?: ApiFieldError[];
}
