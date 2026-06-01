import { describe, expect, it, vi } from 'vitest'
import type { Assessment } from '../domain/types'
import { buildAssessmentActions } from './tableActionsConfig'

function createAssessment(overrides: Partial<Assessment> = {}): Assessment {
  return {
    id: 'assessment-1',
    type: 'r',
    spec: 'Jan Kowalski',
    stand: 'Specjalista',
    dzial: 'Operacje',
    oce: 'Lider 1',
    data: '2026-05-20',
    period: 'P2 2026',
    avgFinal: 88,
    secAvg: {},
    contactResults: [],
    rating: 'good',
    notes: '',
    contactCount: 1,
    ids: ['CALL-1'],
    snapshotScores: {},
    snapshotNotes: {},
    gold: [],
    goldDesc: '',
    status: 'approved',
    statusHistory: [],
    createdAt: '2026-05-20T10:00:00.000Z',
    leaderScope: 'Lider 1',
    ...overrides,
  }
}

describe('tableActionsConfig', () => {
  it('builds stable action ids in the expected order', () => {
    const handlers = {
      onPreview: vi.fn(),
      onPrint: vi.fn(),
      onEdit: vi.fn(),
      onAdvance: vi.fn(),
      onDelete: vi.fn(),
    }

    const actions = buildAssessmentActions(handlers)

    expect(actions.map((action) => action.key)).toEqual(['view', 'print', 'edit', 'advance', 'delete'])
    expect(actions.map((action) => action.permission)).toEqual([
      'evaluations.read',
      'evaluations.export',
      'evaluations.edit',
      'evaluations.edit',
      'evaluations.delete',
    ])
    expect(actions.find((action) => action.key === 'delete')?.danger).toBe(true)
  })

  it('omits actions without handlers and preserves disabled reasons', () => {
    const assessment = createAssessment()
    const actions = buildAssessmentActions(
      {
        onPreview: vi.fn(),
        onEdit: vi.fn(),
      },
      {
        canEdit: () => false,
      },
    )

    expect(actions.map((action) => action.key)).toEqual(['view', 'edit'])
    const editDisabled = actions[1].disabled
    expect(typeof editDisabled).toBe('function')
    expect(typeof editDisabled === 'function' ? editDisabled(assessment) : editDisabled).toBe('action.disabled.noPermission')
  })
})
