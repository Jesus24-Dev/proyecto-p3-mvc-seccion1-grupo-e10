export interface AuditLogResponse {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: string;
  user_id: string | null;
  user_email: string;
  created_at: Date;
}
