import type { Assessment, UserProfile } from '../domain/types'

export function canCreate(user: UserProfile): boolean {
  return ['admin', 'director', 'leader', 'assessor'].includes(user.role)
}

export function canAdmin(user: UserProfile): boolean {
  return ['admin', 'director'].includes(user.role)
}

export function canViewTeam(user: UserProfile): boolean {
  return ['admin', 'director', 'leader', 'assessor'].includes(user.role)
}

export function canEditAssessment(user: UserProfile, assessment: Pick<Assessment, 'oce' | 'leaderScope'>): boolean {
  if (user.role === 'admin' || user.role === 'director') return true
  if (user.role === 'leader') return Boolean(user.leaderScope) && assessment.leaderScope === user.leaderScope
  if (user.role === 'assessor') return assessment.oce === user.fullName || assessment.oce === user.email
  return false
}

export function isLeaderScoped(user: UserProfile): boolean {
  return user.role === 'leader' && !!user.leaderScope
}

export function getLeaderScope(user: UserProfile): string | null {
  if (user.role === 'admin' || user.role === 'director') return null
  return user.leaderScope || null
}
