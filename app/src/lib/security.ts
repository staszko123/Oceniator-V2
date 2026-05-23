/** Guardy bezpieczeństwa i uprawnień */

import type { UserProfile } from '../domain/types'

export function canCreate(user: UserProfile): boolean {
  return ['admin', 'director', 'leader', 'assessor'].includes(user.role)
}

export function canAdmin(user: UserProfile): boolean {
  return ['admin', 'director'].includes(user.role)
}

export function canViewTeam(user: UserProfile): boolean {
  return ['admin', 'director', 'leader', 'assessor'].includes(user.role)
}

export function canEditAssessment(user: UserProfile, assessmentOwner: string): boolean {
  // Oceniający może edytować swoje oceny
  // Liderzy i admin mogą edytować wszystkie w swoim zakresie
  if (user.role === 'admin' || user.role === 'director') return true
  if (user.role === 'assessor') return assessmentOwner === user.email
  if (user.role === 'leader') return true
  return false
}

export function isLeaderScoped(user: UserProfile): boolean {
  return user.role === 'leader' && !!user.leaderScope
}

export function getLeaderScope(user: UserProfile): string | null {
  if (user.role === 'admin' || user.role === 'director') return null
  return user.leaderScope || null
}
