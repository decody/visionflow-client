export type UserRole = 'SuperAdmin' | 'Operator' | 'Viewer';

export type UserStatus = 'active' | 'inactive' | 'pending_invite';

export type IUser = {
  id: string; // UUID
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar_color?: string | null;
  last_login_at?: string | null; // ISO date string (TIMESTAMPTZ)
  last_login_ip?: string | null; // INET (stored as string, e.g., "192.168.0.1")
  last_login_location?: string | null;
  created_at: string; // ISO date string (TIMESTAMPTZ)
  updated_at: string; // ISO date string (TIMESTAMPTZ)
};
