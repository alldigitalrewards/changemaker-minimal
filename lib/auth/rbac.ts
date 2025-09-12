import { type Role } from '@/lib/types';

// Role definitions
export const ROLES = {
  ADMIN: 'ADMIN' as const,
  PARTICIPANT: 'PARTICIPANT' as const,
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
  ],
  [ROLES.PARTICIPANT]: [
    PERMISSIONS.WORKSPACE_VIEW,
    PERMISSIONS.CHALLENGE_VIEW,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.ENROLLMENT_CREATE,
    PERMISSIONS.ENROLLMENT_VIEW,
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

// Route access control
export function canAccessAdminRoutes(userRole: Role): boolean {
  return isAdmin(userRole);
}

export function canAccessParticipantRoutes(userRole: Role): boolean {
  return isParticipant(userRole) || isAdmin(userRole);
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
      participant: `${basePath}/participant`,
      dashboard: `${basePath}/admin/dashboard`,
      challenges: `${basePath}/admin/challenges`,
      users: `${basePath}/admin/users`,
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