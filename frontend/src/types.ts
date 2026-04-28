export type UserRole = 'USER' | 'ADMIN' | 'DISTRIBUTOR';

export interface User {
  id: string;
  email: string;
  role: UserRole;
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

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  status: 'error';
  message?: string;
  errors?: ApiFieldError[];
}
