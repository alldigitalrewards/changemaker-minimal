import { type Role } from '@/lib/types';

// Role definitions
export const ROLES = {
  ADMIN: 'ADMIN' as const,
  PARTICIPANT: 'PARTICIPANT' as const,
  MANAGER: 'MANAGER' as const,
} satisfies Record<string, Role>;

// Permission definitions
export const PERMISSIONS = {
  // Workspace permissions
  WORKSPACE_MANAGE: 'workspace:manage',
  WORKSPACE_VIEW: 'workspace:view',

  // Challenge permissions
  CHALLENGE_CREATE: 'challenge:create',
  CHALLENGE_EDIT: 'challenge:edit',
  CHALLENGE_DELETE: 'challenge:delete',
  CHALLENGE_VIEW: 'challenge:view',

  // User permissions
  USER_MANAGE: 'user:manage',
  USER_VIEW: 'user:view',

  // Enrollment permissions
  ENROLLMENT_CREATE: 'enrollment:create',
  ENROLLMENT_VIEW: 'enrollment:view',
  ENROLLMENT_MANAGE: 'enrollment:manage',

  // Submission permissions
  SUBMISSION_REVIEW: 'submission:review',
  SUBMISSION_VIEW: 'submission:view',
} as const;

type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role to permissions mapping
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.ADMIN]: [
    PERMISSIONS.WORKSPACE_MANAGE,
    PERMISSIONS.WORKSPACE_VIEW,
    PERMISSIONS.CHALLENGE_CREATE,
    PERMISSIONS.CHALLENGE_EDIT,
    PERMISSIONS.CHALLENGE_DELETE,
    PERMISSIONS.CHALLENGE_VIEW,
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.ENROLLMENT_CREATE,
    PERMISSIONS.ENROLLMENT_VIEW,
    PERMISSIONS.ENROLLMENT_MANAGE,
    PERMISSIONS.SUBMISSION_REVIEW,
    PERMISSIONS.SUBMISSION_VIEW,
  ],
  [ROLES.MANAGER]: [
    PERMISSIONS.WORKSPACE_VIEW,
    PERMISSIONS.CHALLENGE_VIEW,
    PERMISSIONS.CHALLENGE_EDIT, // Can edit assigned challenges
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.ENROLLMENT_VIEW,
    PERMISSIONS.SUBMISSION_REVIEW, // Can review submissions
    PERMISSIONS.SUBMISSION_VIEW,
  ],
  [ROLES.PARTICIPANT]: [
    PERMISSIONS.WORKSPACE_VIEW,
    PERMISSIONS.CHALLENGE_VIEW,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.ENROLLMENT_CREATE,
    PERMISSIONS.ENROLLMENT_VIEW,
    PERMISSIONS.SUBMISSION_VIEW, // Can view own submissions
  ],
};

// Helper functions
export function hasRole(userRole: Role, requiredRole: Role): boolean {
  return userRole === requiredRole;
}

export function hasPermission(userRole: Role, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  return rolePermissions.includes(permission);
}

export function isAdmin(userRole: Role): boolean {
  return userRole === ROLES.ADMIN;
}

export function isParticipant(userRole: Role): boolean {
  return userRole === ROLES.PARTICIPANT;
}

export function isManager(userRole: Role): boolean {
  return userRole === ROLES.MANAGER;
}

// Platform-level authorization
// Detect elevated, cross-tenant capability via platformSuperAdmin boolean field
export function isPlatformSuperAdmin(
  input: { permissions?: string[]; platformSuperAdmin?: boolean } | string[] | null | undefined,
  email?: string
): boolean {
  // If input is an object with platformSuperAdmin field, use that (preferred)
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    if ('platformSuperAdmin' in input) {
      return input.platformSuperAdmin === true;
    }
  }

  // Fallback to legacy permissions array check (for backwards compatibility)
  const permissions = Array.isArray(input) ? input : (input?.permissions ?? []);
  return permissions.includes('platform_super_admin');
}

// Route access control
export function canAccessAdminRoutes(userRole: Role): boolean {
  return isAdmin(userRole);
}

export function canAccessManagerRoutes(userRole: Role): boolean {
  return isManager(userRole) || isAdmin(userRole);
}

export function canAccessParticipantRoutes(userRole: Role): boolean {
  return isParticipant(userRole) || isAdmin(userRole) || isManager(userRole);
}

// Workspace ownership checks
export function isWorkspaceOwner(userRole: Role, userId: string, workspaceOwnerId?: string): boolean {
  return isAdmin(userRole) && workspaceOwnerId === userId;
}

export function canLeaveWorkspace(userRole: Role, userId: string, workspaceOwnerId?: string): boolean {
  // Admins can leave unless they're the owner
  if (isAdmin(userRole)) {
    return workspaceOwnerId !== userId;
  }
  // Participants can always leave
  return isParticipant(userRole);
}

export function canDeleteWorkspace(userRole: Role, userId: string, workspaceOwnerId?: string): boolean {
  // Only the workspace owner can delete the workspace
  return isWorkspaceOwner(userRole, userId, workspaceOwnerId);
}

// Path-based access control for workspace routes
export function getAccessiblePaths(userRole: Role, workspaceSlug: string) {
  const basePath = `/w/${workspaceSlug}`;

  if (isAdmin(userRole)) {
    return {
      admin: `${basePath}/admin`,
      manager: `${basePath}/manager`,
      participant: `${basePath}/participant`,
      dashboard: `${basePath}/admin/dashboard`,
      challenges: `${basePath}/admin/challenges`,
      users: `${basePath}/admin/users`,
    };
  }

  if (isManager(userRole)) {
    return {
      manager: `${basePath}/manager`,
      participant: `${basePath}/participant`,
      dashboard: `${basePath}/manager/dashboard`,
      challenges: `${basePath}/manager/challenges`,
      submissions: `${basePath}/manager/submissions`,
    };
  }

  if (isParticipant(userRole)) {
    return {
      participant: `${basePath}/participant`,
      dashboard: `${basePath}/participant/dashboard`,
      challenges: `${basePath}/participant/challenges`,
    };
  }

  return {};
}