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

export interface Agency {
  id: string;
  name: string;
  location: string;
  is_active: boolean;
  user_id: string;
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
}

export interface Automation {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  definition: AutomationDefinition;
  created_at: string;
  updated_at: string;
}

export interface SaveAutomationPayload {
  name: string;
  description?: string;
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
