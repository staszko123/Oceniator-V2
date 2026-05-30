import type { NotificationType } from '../types/notification'
import type { AssessmentStatus } from '../domain/types'

export const assessmentStatusConfig: Record<AssessmentStatus, { labelKey: string; label: string; tone: 'neutral' | 'warning' | 'success' | 'danger' }> = {
  submitted: { labelKey: 'status.submitted', label: 'Do weryfikacji', tone: 'warning' },
  review: { labelKey: 'status.review', label: 'W weryfikacji', tone: 'warning' },
  approved: { labelKey: 'status.approved', label: 'Zatwierdzona', tone: 'success' },
  archived: { labelKey: 'status.archived', label: 'Archiwum', tone: 'neutral' },
}

export const notificationTypeConfig: Record<NotificationType, { labelKey: string; tone: 'neutral' | 'warning' | 'success' | 'danger' }> = {
  newEvaluation: { labelKey: 'notification.newEvaluation', tone: 'success' },
  lowScore: { labelKey: 'notification.lowScore', tone: 'warning' },
  needsReview: { labelKey: 'notification.needsReview', tone: 'warning' },
  newComment: { labelKey: 'notification.newComment', tone: 'neutral' },
  syncError: { labelKey: 'notification.syncError', tone: 'danger' },
  saveSuccess: { labelKey: 'notification.saveSuccess', tone: 'success' },
  systemAction: { labelKey: 'notification.systemAction', tone: 'neutral' },
}
