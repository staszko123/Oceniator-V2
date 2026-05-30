import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearNotifications,
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  pushNotification,
  unreadNotificationCount,
} from './notificationsService'

describe('notifications service', () => {
  beforeEach(() => {
    clearNotifications()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('pushes notifications and keeps unread counts in sync', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-1111-4111-8111-111111111111')

    const baseline = loadNotifications()
    expect(baseline).toHaveLength(1)
    expect(unreadNotificationCount(baseline)).toBe(1)

    const next = pushNotification({
      type: 'systemAction',
      title: 'System',
      message: 'Processed',
      relatedEntityType: 'settings',
    })

    expect(next[0].id).toBe('11111111-1111-4111-8111-111111111111')
    expect(unreadNotificationCount(next)).toBe(2)

    const marked = markNotificationRead('11111111-1111-4111-8111-111111111111')
    expect(marked.find((item) => item.id === '11111111-1111-4111-8111-111111111111')?.read).toBe(true)
    expect(unreadNotificationCount(marked)).toBe(1)

    const allRead = markAllNotificationsRead()
    expect(unreadNotificationCount(allRead)).toBe(0)
  })
})
