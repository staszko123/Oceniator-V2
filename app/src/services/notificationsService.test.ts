import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createNotification,
  markAllNotificationsRead,
  markNotificationRead,
  unreadNotificationCount,
} from './notificationsService'

describe('notifications helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('leaves notifications unchanged when marking an unknown id', () => {
    const notifications = [
      {
        id: 'notification-1',
        type: 'systemAction' as const,
        title: 'System',
        message: 'Processed',
        read: false,
        createdAt: '2026-05-30T08:00:00.000Z',
      },
    ]

    const marked = markNotificationRead(notifications, 'missing-id')

    expect(marked).toEqual(notifications)
    expect(marked[0]).toBe(notifications[0])
    expect(unreadNotificationCount(marked)).toBe(1)
  })

  it('creates notifications and keeps unread counts in sync', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-1111-4111-8111-111111111111')

    const notification = createNotification({
      type: 'systemAction',
      title: 'System',
      message: 'Processed',
      relatedEntityType: 'settings',
      userId: 'user-1',
    })
    const list = [notification]

    expect(notification.id).toBe('11111111-1111-4111-8111-111111111111')
    expect(notification.userId).toBe('user-1')
    expect(unreadNotificationCount(list)).toBe(1)

    const marked = markNotificationRead(list, notification.id)
    expect(marked[0].read).toBe(true)
    expect(unreadNotificationCount(marked)).toBe(0)

    expect(unreadNotificationCount(markAllNotificationsRead(list))).toBe(0)
  })

  it('keeps optional related entity metadata in created notifications', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('22222222-2222-4222-8222-222222222222')
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T12:00:00.000Z'))

    const notification = createNotification({
      type: 'needsReview',
      title: 'Review assessment',
      message: 'Assessment is ready for QA review.',
      relatedEntityType: 'evaluation',
      relatedEntityId: 'assessment-42',
      userId: 'user-7',
    })

    expect(notification).toMatchObject({
      id: '22222222-2222-4222-8222-222222222222',
      type: 'needsReview',
      title: 'Review assessment',
      message: 'Assessment is ready for QA review.',
      relatedEntityType: 'evaluation',
      relatedEntityId: 'assessment-42',
      userId: 'user-7',
      read: false,
      createdAt: '2026-06-01T12:00:00.000Z',
    })

    vi.useRealTimers()
  })
})
