/**
 * Role-Based Color System
 * ======================
 * Consistent color palette for role-based UI elements across the platform
 *
 * USAGE:
 * - SUPERADMIN: Purple theme for platform-level features
 * - ADMIN: Coral/terracotta theme for workspace admin features
 * - PARTICIPANT: Blue theme for participant features
 */

export const ROLE_COLORS = {
  SUPERADMIN: {
    bg: 'bg-purple-100',
    bgGradient: 'bg-gradient-to-br from-purple-50 to-white',
    text: 'text-purple-700',
    textMuted: 'text-purple-600',
    border: 'border-purple-200',
    borderSolid: 'border-purple-300',
    hover: 'hover:bg-purple-200',
    hoverBorder: 'hover:border-purple-300',
    focus: 'focus:ring-purple-500',
    button: 'bg-purple-600 hover:bg-purple-700 text-white',
    buttonOutline: 'border-purple-600 text-purple-600 hover:bg-purple-50',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
    card: 'border-purple-200 bg-gradient-to-br from-purple-50 to-white',
    icon: 'text-purple-600',
  },
  ADMIN: {
    bg: 'bg-coral-100',
    bgGradient: 'bg-gradient-to-br from-coral-50 to-white',
    text: 'text-coral-700',
    textMuted: 'text-coral-600',
    border: 'border-coral-200',
    borderSolid: 'border-coral-300',
    hover: 'hover:bg-coral-200',
    hoverBorder: 'hover:border-coral-300',
    focus: 'focus:ring-coral-500',
    button: 'bg-coral-600 hover:bg-coral-700 text-white',
    buttonOutline: 'border-coral-600 text-coral-600 hover:bg-coral-50',
    badge: 'bg-coral-100 text-coral-800 border-coral-200',
    card: 'border-coral-200 bg-gradient-to-br from-coral-50 to-white',
    icon: 'text-coral-600',
  },
  PARTICIPANT: {
    bg: 'bg-blue-100',
    bgGradient: 'bg-gradient-to-br from-blue-50 to-white',
    text: 'text-blue-700',
    textMuted: 'text-blue-600',
    border: 'border-blue-200',
    borderSolid: 'border-blue-300',
    hover: 'hover:bg-blue-200',
    hoverBorder: 'hover:border-blue-300',
    focus: 'focus:ring-blue-500',
    button: 'bg-blue-600 hover:bg-blue-700 text-white',
    buttonOutline: 'border-blue-600 text-blue-600 hover:bg-blue-50',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    card: 'border-blue-200 bg-gradient-to-br from-blue-50 to-white',
    icon: 'text-blue-600',
  },
} as const;

export type RoleColorKey = keyof typeof ROLE_COLORS;

/**
 * Get role colors by role name
 */
export function getRoleColors(role: RoleColorKey) {
  return ROLE_COLORS[role];
}

/**
 * Get role color by role string (with fallback)
 */
export function getRoleColorsByString(role: string) {
  if (role === 'ADMIN') return ROLE_COLORS.ADMIN;
  if (role === 'PARTICIPANT') return ROLE_COLORS.PARTICIPANT;
  if (role === 'SUPERADMIN' || role === 'platform_super_admin') return ROLE_COLORS.SUPERADMIN;
  return ROLE_COLORS.PARTICIPANT; // Default fallback
}
