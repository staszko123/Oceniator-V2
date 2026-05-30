import type { Notification, NotificationEntityType, NotificationType } from '../types/notification'
import { readStorageJson, writeStorageJson } from '../utils/storage'

const key = 'oc_v2_notifications'
const maxNotifications = 100

const defaultNotifications: Notification[] = [
  {
    id: 'seed-1',
    type: 'saveSuccess',
    title: 'Karta zapisana',
    message: 'Ostatni zapis zakończył się poprawnie.',
    read: false,
    createdAt: new Date().toISOString(),
    relatedEntityType: 'evaluation',
  },
]

function readNotifications(): Notification[] {
  const value = readStorageJson<Notification[] | null>(key, null)
  return Array.isArray(value) ? value : []
}

function persist(notifications: Notification[]): void {
  writeStorageJson(key, notifications.slice(0, maxNotifications))
}

export function loadNotifications(): Notification[] {
  const notifications = readNotifications()
  if (notifications.length) return notifications
  persist(defaultNotifications)
  return defaultNotifications
}

export function unreadNotificationCount(notifications: Notification[]): number {
  return notifications.filter((item) => !item.read).length
}

export function markNotificationRead(id: string): Notification[] {
  const next = loadNotifications().map((item) => (item.id === id ? { ...item, read: true } : item))
  persist(next)
  return next
}

export function markAllNotificationsRead(): Notification[] {
  const next = loadNotifications().map((item) => ({ ...item, read: true }))
  persist(next)
  return next
}

export function pushNotification(payload: {
  type: NotificationType
  title: string
  message: string
  relatedEntityType?: NotificationEntityType
  relatedEntityId?: string
}): Notification[] {
  const nextNotification: Notification = {
    id: crypto.randomUUID(),
    type: payload.type,
    title: payload.title,
    message: payload.message,
    read: false,
    createdAt: new Date().toISOString(),
    relatedEntityType: payload.relatedEntityType,
    relatedEntityId: payload.relatedEntityId,
  }
  const next = [nextNotification, ...loadNotifications()].slice(0, maxNotifications)
  persist(next)
  return next
}

export function clearNotifications(): void {
  persist([])
}

