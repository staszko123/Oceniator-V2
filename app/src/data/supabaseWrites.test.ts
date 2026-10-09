import { describe, expect, it, vi } from 'vitest'
import { SupabaseDataProvider } from './supabaseProvider'
import { createDraft, draftToAssessment } from '../domain/scoring'

function fixture(existing: { created_by: string | null } | null, writeError: Error | null = null) {
  const lookup = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: existing, error: null }) }
  const mutation = { update: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: writeError ? null : { id: 'card' }, error: writeError }) }
  const provider = new SupabaseDataProvider()
  Object.assign(provider, { _client: { from: vi.fn().mockReturnValueOnce(lookup).mockReturnValue(mutation) }, currentUser: { id: 'admin-id', role: 'admin' } })
  const assessment = draftToAssessment(createDraft('r'), 'Scope')
  return { provider, mutation, assessment }
}

describe('Supabase assessment writes', () => {
  it('updates a non-submitted card without an INSERT trigger or changing historical ownership', async () => {
    const { provider, mutation, assessment } = fixture({ created_by: null })
    await provider.saveAssessment({ ...assessment, status: 'review' })
    expect(mutation.update).toHaveBeenCalledOnce()
    expect(mutation.update.mock.calls[0][0]).not.toHaveProperty('created_by')
    expect(mutation.insert).not.toHaveBeenCalled()
    expect(mutation.eq).toHaveBeenCalledWith('id', assessment.id)
  })
  it('inserts a new submitted card with the authenticated author', async () => {
    const { provider, mutation, assessment } = fixture(null)
    await provider.saveAssessment(assessment)
    expect(mutation.insert.mock.calls[0][0]).toMatchObject({ created_by: 'admin-id', status: 'submitted' })
    expect(mutation.update).not.toHaveBeenCalled()
  })
  it('does not report success when the database rejects or returns no writable row', async () => {
    const { provider, assessment } = fixture({ created_by: 'original' }, new Error('No writable row'))
    await expect(provider.saveAssessment(assessment)).rejects.toThrow('No writable row')
  })
})
