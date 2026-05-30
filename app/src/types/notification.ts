export type NotificationType =
  | 'newEvaluation'
  | 'lowScore'
  | 'needsReview'
  | 'newComment'
  | 'syncError'
  | 'saveSuccess'
  | 'systemAction'

export type NotificationEntityType = 'evaluation' | 'user' | 'specialist' | 'team' | 'report' | 'settings'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  createdAt: string
  relatedEntityType?: NotificationEntityType
  relatedEntityId?: string
}

