export type UserRole = "USER" | "ADMIN" | "DISTRIBUTOR";

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
}

export interface AgencyTheme {
  /** Nombre del preset de acento (ver lib/themes). */
  accent: string;
  /** Radio base en rem. */
  radius: number;
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
  address: string;
  birthday: string;
  tags: string[];
}

export interface CreateUserInformationPayload {
  user_id: string;
  first_name: string;
  last_name: string;
  address: string;
  birthday: string;
}

export type UpdateUserInformationPayload = Omit<
  CreateUserInformationPayload,
  "user_id"
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
  status: PackageStatus;
  created_at: string;
  contact_id: string;
  order_id: string | null;
}

export interface CreatePackagePayload {
  description: string;
  weight_kg: number;
  contact_id: string;
  order_id?: string;
  status?: PackageStatus;
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

export type PaymentStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Payment {
  id: string;
  reference: string;
  bank: string;
  amount: number;
  status: PaymentStatus;
  paid_at: string;
  validated_at: string | null;
  note: string;
  created_at: string;
  contact_id: string;
  order_id: string | null;
  contact: { id: string; first_name: string; last_name: string } | null;
  order: { id: string; description: string } | null;
}

export interface CreatePaymentPayload {
  reference: string;
  bank?: string;
  amount: number;
  paid_at: string;
  contact_id: string;
  order_id?: string;
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

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  status: "error";
  message?: string;
  errors?: ApiFieldError[];
}
