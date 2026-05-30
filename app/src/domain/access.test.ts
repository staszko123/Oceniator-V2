import { describe, expect, it } from 'vitest'
import type { Assessment, UserProfile } from './types'
import { canAdminRole, canCreateRole, canViewTeamRole, scopeAssessmentsForUser } from './access'

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

function makeAssessment(overrides: Partial<Assessment> = {}): Assessment {
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

describe('access helpers', () => {
  it('keeps role guards aligned with operational access', () => {
    expect(canCreateRole('admin')).toBe(true)
    expect(canCreateRole('leader')).toBe(true)
    expect(canCreateRole('viewer')).toBe(false)

    expect(canAdminRole('admin')).toBe(true)
    expect(canAdminRole('director')).toBe(true)
    expect(canAdminRole('assessor')).toBe(false)

    expect(canViewTeamRole('leader')).toBe(true)
    expect(canViewTeamRole('assessor')).toBe(true)
    expect(canViewTeamRole('viewer')).toBe(false)
  })

  it('scopes assessments for viewer, leader and admin', () => {
    const adminView = scopeAssessmentsForUser(
      [makeAssessment(), makeAssessment({ id: 'assessment-2', spec: 'Anna' })],
      makeUser({ role: 'admin' }),
    )
    expect(adminView).toHaveLength(2)

    const leaderView = scopeAssessmentsForUser(
      [
        makeAssessment(),
        makeAssessment({ id: 'assessment-2', leaderScope: 'Inny Lider', oce: 'Inny Lider' }),
      ],
      makeUser({ role: 'leader', leaderScope: 'Anna Lider' }),
    )
    expect(leaderView).toHaveLength(1)
    expect(leaderView[0].leaderScope).toBe('Anna Lider')

    const viewerView = scopeAssessmentsForUser(
      [
        makeAssessment({ id: 'assessment-1', spec: 'Anna Kowalska' }),
        makeAssessment({ id: 'assessment-2', spec: 'anna@example.com' }),
        makeAssessment({ id: 'assessment-3', spec: 'Ktos Inny' }),
      ],
      makeUser({ role: 'viewer', fullName: 'Anna Kowalska', email: 'anna@example.com' }),
    )
    expect(viewerView.map((item) => item.id)).toEqual(['assessment-1', 'assessment-2'])
  })
})
