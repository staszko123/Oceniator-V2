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
  if (canCompareLeadersRole(user.role)) return true
  if (user.role === 'leader') return Boolean(user.leaderScope) && assessment.leaderScope === user.leaderScope
  if (user.role === 'assessor') {
    return assessment.leaderScope === user.leaderScope
      || assessment.oce === user.fullName
      || assessment.oce === user.email
  }
  return false
}

export function assertCanAdmin(user: UserProfile, message = 'Brak dostepu do tej sekcji.'): void {
  if (!canAdmin(user)) throw new Error(message)
}

export function assertCanEditAssessment(user: UserProfile, assessment: Pick<Assessment, 'oce' | 'leaderScope'>, message = 'Brak dostepu do tej karty.'): void {
  if (!canEditAssessment(user, assessment)) throw new Error(message)
}

export function isLeaderScoped(user: UserProfile): boolean {
  return user.role === 'leader' && !!user.leaderScope
}

export function getLeaderScope(user: UserProfile): string | null {
  if (canCompareLeadersRole(user.role)) return null
  return user.leaderScope || null
}
