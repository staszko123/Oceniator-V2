import type { Assessment, UserProfile } from '../domain/types'
import {
  canAdminRole,
  canCompareLeadersRole,
  canCreateRole,
  canViewTeamRole,
} from '../domain/access'

export function canCreate(user: UserProfile): boolean {
  return canCreateRole(user.role)
}

export function canAdmin(user: UserProfile): boolean {
  return canAdminRole(user.role)
}

export function canViewTeam(user: UserProfile): boolean {
  return canViewTeamRole(user.role)
}

export function canEditAssessment(user: UserProfile, assessment: Pick<Assessment, 'oce' | 'leaderScope'>): boolean {
  if (user.role === 'admin') return true
  if (user.role === 'director') return false
  if (user.role === 'leader') return Boolean(user.leaderScope) && assessment.leaderScope === user.leaderScope
  if (user.role === 'assessor') return Boolean(user.leaderScope) && assessment.leaderScope === user.leaderScope
  return false
}

export function assertCanAdmin(user: UserProfile, message = 'Brak dostępu do tej sekcji.'): void {
  if (!canAdmin(user)) throw new Error(message)
}

export function assertCanEditAssessment(user: UserProfile, assessment: Pick<Assessment, 'oce' | 'leaderScope'>, message = 'Brak dostępu do tej karty.'): void {
  if (!canEditAssessment(user, assessment)) throw new Error(message)
}

export function isLeaderScoped(user: UserProfile): boolean {
  return user.role === 'leader' && !!user.leaderScope
}

export function getLeaderScope(user: UserProfile): string | null {
  if (canCompareLeadersRole(user.role)) return null
  return user.leaderScope || null
}
