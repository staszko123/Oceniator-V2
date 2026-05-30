import { describe, expect, it } from 'vitest'
import { createDraft } from './scoring'
import type { Assessment, AssessmentDraft, AssessmentType, ManagedUser } from './types'
import {
  clearDraft,
  commitDraftAfterSave,
  mergeImportedAssessments,
  prependManagedUser,
  replaceAssessmentById,
  replaceManagedUserById,
} from './workflows'

function makeDraft(type: AssessmentType): AssessmentDraft {
  return createDraft(type)
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

function makeUser(overrides: Partial<ManagedUser> = {}): ManagedUser {
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

describe('workflow helpers', () => {
  it('clears and commits drafts without mutating the source object', () => {
    const drafts = { r: makeDraft('r'), m: makeDraft('m'), s: makeDraft('s') }
    const afterCommit = commitDraftAfterSave(drafts, 'r')
    const afterClear = clearDraft(drafts, 'm')

    expect(afterCommit.r).toBeUndefined()
    expect(afterCommit.m).toBeDefined()
    expect(afterClear.m).toBeUndefined()
    expect(drafts.r).toBeDefined()
  })

  it('merges imported assessments by id and keeps newer imports first', () => {
    const merged = mergeImportedAssessments(
      [makeAssessment(), makeAssessment({ id: 'assessment-2', spec: 'Inny Specjalista' })],
      [makeAssessment({ id: 'assessment-2', spec: 'Zastapiony Specjalista' })],
    )

    expect(merged).toHaveLength(2)
    expect(merged[0].spec).toBe('Zastapiony Specjalista')
    expect(merged.find((item) => item.id === 'assessment-1')).toBeTruthy()
  })

  it('replaces existing items by id', () => {
    const assessments = [makeAssessment(), makeAssessment({ id: 'assessment-2', spec: 'Inny Specjalista' })]
    const nextAssessment = makeAssessment({ id: 'assessment-2', spec: 'Aktualny Specjalista' })
    const users = [makeUser(), makeUser({ id: 'user-2', email: 'two@example.com' })]
    const nextUser = makeUser({ id: 'user-2', email: 'updated@example.com' })

    expect(replaceAssessmentById(assessments, nextAssessment)[1].spec).toBe('Aktualny Specjalista')
    expect(replaceManagedUserById(users, nextUser)[1].email).toBe('updated@example.com')
    expect(prependManagedUser(users, nextUser)[0].id).toBe('user-2')
  })
})
