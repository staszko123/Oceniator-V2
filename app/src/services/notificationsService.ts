import type { Notification, NotificationEntityType, NotificationType } from '../types/notification'

export function unreadNotificationCount(notifications: Notification[]): number {
  return notifications.filter((item) => !item.read).length
}

export function markNotificationRead(notifications: Notification[], id: string): Notification[] {
  return notifications.map((item) => (item.id === id ? { ...item, read: true } : item))
}

export function markAllNotificationsRead(notifications: Notification[]): Notification[] {
  return notifications.map((item) => ({ ...item, read: true }))
}

export function createNotification(payload: {
  type: NotificationType
  title: string
  message: string
  relatedEntityType?: NotificationEntityType
  relatedEntityId?: string
  userId?: string
}): Notification {
  return {
    id: crypto.randomUUID(),
    userId: payload.userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    read: false,
    createdAt: new Date().toISOString(),
    relatedEntityType: payload.relatedEntityType,
    relatedEntityId: payload.relatedEntityId,
  }
}
