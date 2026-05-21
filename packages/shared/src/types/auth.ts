export type AuthAuditStatus = 'success' | 'failure';

export type AuthAuditLog = {
  id: string;
  event_type: 'login';
  provider: string;
  email?: string | null;
  user_id?: string | null;
  ip?: string | null;
  location?: string | null;
  user_agent?: string | null;
  status: AuthAuditStatus;
  reason?: string | null;
  created_at: string;
};
