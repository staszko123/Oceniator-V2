import type { Assessment, UserProfile } from './types'
import type { Role } from './types'

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

export function scopeAssessmentsForUser(assessments: Assessment[], user: UserProfile): Assessment[] {
  if (user.role === 'admin' || user.role === 'director') return assessments
  if (user.role === 'viewer') {
    const specialistTokens = [user.fullName, user.email].map((item) => item.trim()).filter(Boolean)
    return assessments.filter((item) => specialistTokens.some((token) => item.spec === token))
  }
  return assessments.filter((item) => item.leaderScope === user.leaderScope || item.oce === user.leaderScope)
}
