import type { DataProvider, UserProfile } from '../domain/types'

export const SCORE_GREAT_THRESHOLD = 92
export const SCORE_GOOD_THRESHOLD = 82

export function scoreClass(score: number): string {
  if (score >= SCORE_GREAT_THRESHOLD) return 'score score-great'
  if (score >= SCORE_GOOD_THRESHOLD) return 'score score-good'
  return 'score score-below'
}

export const ROLE_LABELS: Record<UserProfile['role'], string> = {
  admin: 'Administrator',
  director: 'Dyrektor',
  leader: 'Lider',
  assessor: 'Oceniajacy',
  viewer: 'Specjalista',
}

export const ROLE_OPTIONS = Object.entries(ROLE_LABELS) as Array<[UserProfile['role'], string]>

export const PROVIDER_LABELS: Record<DataProvider['mode'], string> = {
  supabase: 'Supabase',
  local: 'Demo lokalne',
}
