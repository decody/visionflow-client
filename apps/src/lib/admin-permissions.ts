import type { UserRole } from '@visionflow/shared';

export const ADMIN_PAGE_ROLES = [
  'SuperAdmin',
  'admin',
  'Viewer',
] satisfies UserRole[];

export const CONTENT_MANAGER_ROLES = [
  'SuperAdmin',
  'admin',
] satisfies UserRole[];

export const USER_MANAGER_ROLES = ['SuperAdmin'] satisfies UserRole[];

export const QNA_DELETE_ROLES = ['SuperAdmin'] satisfies UserRole[];

export function normalizeUserRole(role: unknown): UserRole | null {
  if (typeof role !== 'string') {
    return null;
  }

  const normalizedRole = role.trim().toLowerCase().replace(/[\s_-]/g, '');

  if (normalizedRole === 'superadmin') {
    return 'SuperAdmin';
  }

  if (normalizedRole === 'admin') {
    return 'admin';
  }

  if (normalizedRole === 'viewer' || normalizedRole === 'user') {
    return 'Viewer';
  }

  return null;
}

export function hasAllowedRole(
  role: unknown,
  allowedRoles: readonly UserRole[],
) {
  const normalizedRole = normalizeUserRole(role);

  return normalizedRole ? allowedRoles.includes(normalizedRole) : false;
}

export function canManageContent(role: unknown) {
  return hasAllowedRole(role, CONTENT_MANAGER_ROLES);
}

export function canManageUsers(role: unknown) {
  return hasAllowedRole(role, USER_MANAGER_ROLES);
}

export function canDeleteQna(role: unknown) {
  return hasAllowedRole(role, QNA_DELETE_ROLES);
}
