import type { Assessment, UserProfile } from './types'
import type { Role } from './types'
import type { Permission } from '../types/permissions'
import { hasPermission as hasPermissionConfig } from '../config/permissions'

export const OPERATIONAL_ROLES: Role[] = ['admin', 'director', 'leader', 'assessor']
export const ADMIN_ROLES: Role[] = ['admin', 'director']
export const TEAM_ROLES: Role[] = ['admin', 'director', 'leader', 'assessor']

export function hasRole(role: Role, allowedRoles: ReadonlyArray<Role>): boolean {
  return allowedRoles.includes(role)
}

export function canCreateRole(role: Role): boolean {
  return hasRole(role, OPERATIONAL_ROLES)
}

export function canAdminRole(role: Role): boolean {
  return hasRole(role, ADMIN_ROLES)
}

export function canViewTeamRole(role: Role): boolean {
  return hasRole(role, TEAM_ROLES)
}

export function viewerAssessmentTokens(user: UserProfile): string[] {
  const tokens = [user.id, user.fullName, user.email]
    .map((item) => item.trim())
    .filter(Boolean)

  if (user.role === 'viewer' && (user.id === 'podglad' || user.email === 'podglad@local')) {
    tokens.push('Anna Kowalska')
  }

  return [...new Set(tokens)]
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return hasPermissionConfig(role, permission)
}

export function scopeAssessmentsForUser(assessments: Assessment[], user: UserProfile): Assessment[] {
  if (user.role === 'admin' || user.role === 'director') return assessments
  if (user.role === 'viewer') {
    const specialistTokens = viewerAssessmentTokens(user)
    return assessments.filter((item) => (
      item.status === 'approved'
      && specialistTokens.some((token) => item.spec === token || item.oce === token)
    ))
  }
  return assessments.filter((item) => item.leaderScope === user.leaderScope || item.oce === user.leaderScope)
}
