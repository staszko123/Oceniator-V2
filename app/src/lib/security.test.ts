import { describe, expect, it } from 'vitest'
import type { Assessment, UserProfile } from '../domain/types'
import { canAdmin, canCreate, canEditAssessment, canViewTeam, getLeaderScope, isLeaderScoped } from './security'

function makeUser(overrides: Partial<UserProfile>): UserProfile {
  return {
    id: 'user-1',
    email: 'user@example.com',
    fullName: 'Uzytkownik Testowy',
    role: 'viewer',
    leaderScope: '',
    isActive: true,
    source: 'local',
    ...overrides,
  }
}

function makeAssessment(overrides: Partial<Assessment>): Assessment {
  return {
    id: 'assessment-1',
    type: 'r',
    spec: 'Jan Kowalski',
    stand: 'Specjalista',
    dzial: 'Sprzedaz',
    oce: 'Anna Lider',
    data: '2026-05-29',
    period: 'P2 2026',
    avgFinal: 90,
    secAvg: { standard: 90 },
    contactResults: [],
    rating: 'good',
    notes: '',
    contactCount: 1,
    ids: ['CALL-1'],
    snapshotScores: { standard: [[1]] },
    snapshotNotes: { standard: [''] },
    gold: [0],
    goldDesc: '',
    status: 'submitted',
    statusHistory: [],
    createdAt: '2026-05-29T08:30:00.000Z',
    leaderScope: 'Anna Lider',
    ...overrides,
  }
}

describe('security guards', () => {
  it('allows creation only for operational roles', () => {
    expect(canCreate(makeUser({ role: 'admin' }))).toBe(true)
    expect(canCreate(makeUser({ role: 'director' }))).toBe(true)
    expect(canCreate(makeUser({ role: 'leader' }))).toBe(true)
    expect(canCreate(makeUser({ role: 'assessor' }))).toBe(true)
    expect(canCreate(makeUser({ role: 'viewer' }))).toBe(false)
  })

  it('limits admin access to admin and director', () => {
    expect(canAdmin(makeUser({ role: 'admin' }))).toBe(true)
    expect(canAdmin(makeUser({ role: 'director' }))).toBe(true)
    expect(canAdmin(makeUser({ role: 'leader' }))).toBe(false)
  })

  it('keeps team view hidden from viewer', () => {
    expect(canViewTeam(makeUser({ role: 'leader' }))).toBe(true)
    expect(canViewTeam(makeUser({ role: 'assessor' }))).toBe(true)
    expect(canViewTeam(makeUser({ role: 'viewer' }))).toBe(false)
  })

  it('enforces edit scope by role', () => {
    const scopedAssessment = makeAssessment({})

    expect(canEditAssessment(makeUser({ role: 'admin' }), scopedAssessment)).toBe(true)
    expect(canEditAssessment(makeUser({ role: 'director' }), scopedAssessment)).toBe(true)
    expect(canEditAssessment(makeUser({ role: 'leader', leaderScope: 'Anna Lider' }), scopedAssessment)).toBe(true)
    expect(canEditAssessment(makeUser({ role: 'leader', leaderScope: 'Inny Lider' }), scopedAssessment)).toBe(false)
    expect(canEditAssessment(makeUser({ role: 'assessor', fullName: 'Anna Lider' }), scopedAssessment)).toBe(true)
    expect(canEditAssessment(makeUser({ role: 'assessor', email: 'anna@example.com' }), makeAssessment({ oce: 'anna@example.com' }))).toBe(true)
    expect(canEditAssessment(makeUser({ role: 'viewer' }), scopedAssessment)).toBe(false)
  })

  it('returns leader scope helpers consistently', () => {
    expect(isLeaderScoped(makeUser({ role: 'leader', leaderScope: 'Anna Lider' }))).toBe(true)
    expect(isLeaderScoped(makeUser({ role: 'leader', leaderScope: '' }))).toBe(false)
    expect(getLeaderScope(makeUser({ role: 'admin', leaderScope: 'Anna Lider' }))).toBeNull()
    expect(getLeaderScope(makeUser({ role: 'leader', leaderScope: 'Anna Lider' }))).toBe('Anna Lider')
  })
})
