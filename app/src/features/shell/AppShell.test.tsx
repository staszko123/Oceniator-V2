// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LayoutDashboard } from 'lucide-react'
import AppShell from './AppShell'
import type { Notification } from '../../types/notification'
import type { UserProfile } from '../../domain/types'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const user: UserProfile = {
  id: 'user-1',
  email: 'admin@example.com',
  fullName: 'Admin User',
  role: 'admin',
  leaderScope: 'all',
  isActive: true,
  source: 'local',
}

const navItems = [
  { key: 'start' as const, label: 'Start', icon: LayoutDashboard },
  { key: 'registry' as const, label: 'Ewidencja', icon: LayoutDashboard },
]

let activeContainer: HTMLDivElement | null = null
let activeRoot: ReturnType<typeof createRoot> | null = null

function renderShell(view: 'start' | 'registry' = 'registry', notifications: Notification[] = []) {
  activeContainer = document.createElement('div')
  document.body.appendChild(activeContainer)
  activeRoot = createRoot(activeContainer)

  act(() => {
    activeRoot!.render(
      <AppShell
        user={user}
        providerMode="local"
        view={view}
        navItems={navItems}
        setView={vi.fn()}
        onLogout={vi.fn()}
        notifications={notifications}
        collapsed={true}
        onCollapsedChange={vi.fn()}
      >
        <div>content</div>
      </AppShell>,
    )
  })
}

function renderShellWithNotice(systemNotice: string) {
  activeContainer = document.createElement('div')
  document.body.appendChild(activeContainer)
  activeRoot = createRoot(activeContainer)

  act(() => {
    activeRoot!.render(
      <AppShell
        user={user}
        providerMode="local"
        view="registry"
        navItems={navItems}
        setView={vi.fn()}
        onLogout={vi.fn()}
        systemNotice={systemNotice}
        collapsed={true}
        onCollapsedChange={vi.fn()}
      >
        <div>content</div>
      </AppShell>,
    )
  })
}

afterEach(() => {
  act(() => {
    activeRoot?.unmount()
  })
  activeRoot = null
  activeContainer?.remove()
  activeContainer = null
  document.documentElement.className = ''
  window.localStorage.clear()
})

describe('AppShell', () => {
  it('marks the active sidebar item as the current page', () => {
    renderShell('registry')

    const currentItem = Array.from(document.querySelectorAll('.side-nav button')).find((button) => button.textContent?.includes('Ewidencja'))
    const inactiveItem = Array.from(document.querySelectorAll('.side-nav button')).find((button) => button.textContent?.includes('Start'))

    expect(currentItem?.getAttribute('aria-current')).toBe('page')
    expect(inactiveItem?.hasAttribute('aria-current')).toBe(false)
  })

  it('exposes an explicit accessible label on the logout action', () => {
    renderShell()

    const logoutButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Wyloguj'))

    expect(logoutButton?.getAttribute('aria-label')).toBe('Wyloguj')
  })

  it('exposes pressed state on the theme toggle for the active theme', () => {
    renderShell()

    const themeButton = document.querySelector('.topbar-theme')

    expect(themeButton?.getAttribute('aria-pressed')).toBe('false')
  })

  it('keeps the provider mode summary available when the sidebar is collapsed', () => {
    renderShell()

    const providerChip = document.querySelector('.mode-chip')

    expect(providerChip?.getAttribute('aria-label')).toBe('Tryb danych: Demo lokalne')
    expect(providerChip?.getAttribute('title')).toBe('Tryb danych: Demo lokalne')
  })

  it('exposes a combined accessible label for the signed-in user summary', () => {
    renderShell()

    const userSummary = document.querySelector('.topbar-user')

    expect(userSummary?.getAttribute('aria-label')).toBe('Zalogowano jako Admin User, admin@example.com, rola Administrator')
  })

  it('links the sidebar toggle to the navigation region and exposes collapsed state', () => {
    renderShell()

    const sidebarToggle = document.querySelector('.sidebar-toggle')
    const sideNav = document.querySelector('.side-nav')

    expect(sidebarToggle?.getAttribute('aria-controls')).toBe('sidebar-navigation')
    expect(sidebarToggle?.getAttribute('aria-expanded')).toBe('false')
    expect(sideNav?.id).toBe('sidebar-navigation')
  })

  it('keeps the active section summary available when the sidebar is collapsed', () => {
    renderShell('registry')

    expect(document.body.textContent).toContain('Aktywna sekcja: Ewidencja')
  })

  it('announces the system notice as a polite status region', () => {
    renderShellWithNotice('Synchronizacja chwilowo niedostepna')

    const systemNotice = document.querySelector('.system-notice')

    expect(systemNotice?.getAttribute('role')).toBe('status')
    expect(systemNotice?.getAttribute('aria-live')).toBe('polite')
    expect(systemNotice?.getAttribute('aria-atomic')).toBe('true')
  })

  it('labels the notifications popover as a named region when opened', () => {
    renderShell('registry', [
      {
        id: 'notification-1',
        title: 'Nowa ocena',
        message: 'Karta czeka na review',
        type: 'newEvaluation',
        createdAt: '2026-06-01T08:00:00.000Z',
        read: false,
      },
    ])

    const trigger = document.querySelector('.topbar-icon-btn')
    act(() => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const popover = document.querySelector('.notification-popover')
    const title = document.querySelector('#notifications-popover-title')

    expect(popover?.getAttribute('role')).toBe('region')
    expect(popover?.getAttribute('aria-labelledby')).toBe('notifications-popover-title')
    expect(title?.textContent).toBe('Powiadomienia')
  })

  it('disables marking all notifications as read when the popover is empty', () => {
    renderShell('registry', [])

    const trigger = document.querySelector('.topbar-icon-btn')
    act(() => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const markAllButton = Array.from(document.querySelectorAll('.notification-popover button'))
      .find((button) => button.textContent?.includes('Oznacz wszystkie')) as HTMLButtonElement | undefined

    expect(markAllButton?.disabled).toBe(true)
  })
})
