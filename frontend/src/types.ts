export type UserRole = 'USER' | 'ADMIN' | 'DISTRIBUTOR';

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
  password: string;
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

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  status: 'error';
  message?: string;
  errors?: ApiFieldError[];
}
