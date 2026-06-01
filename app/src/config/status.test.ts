import { describe, expect, it } from 'vitest'
import { assessmentStatusConfig, notificationTypeConfig } from './status'

describe('status config', () => {
  it('keeps assessment statuses mapped to explicit labels and tones', () => {
    expect(assessmentStatusConfig.submitted).toEqual({
      labelKey: 'status.submitted',
      label: 'Do weryfikacji',
      tone: 'warning',
    })
    expect(assessmentStatusConfig.approved).toEqual({
      labelKey: 'status.approved',
      label: 'Zatwierdzona',
      tone: 'success',
    })
    expect(assessmentStatusConfig.archived.tone).toBe('neutral')
  })

  it('covers every notification type with a stable tone mapping', () => {
    expect(Object.keys(notificationTypeConfig).sort()).toEqual([
      'lowScore',
      'needsReview',
      'newComment',
      'newEvaluation',
      'saveSuccess',
      'syncError',
      'systemAction',
    ])
    expect(notificationTypeConfig.syncError.tone).toBe('danger')
    expect(notificationTypeConfig.newEvaluation.labelKey).toBe('notification.newEvaluation')
  })
})
