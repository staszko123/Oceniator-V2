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
})
