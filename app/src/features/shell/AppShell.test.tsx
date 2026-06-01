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

  it('keeps the provider mode summary available when the sidebar is collapsed', () => {
    renderShell()

    const providerChip = document.querySelector('.mode-chip')

    expect(providerChip?.getAttribute('aria-label')).toBe('Tryb danych: Demo lokalne')
    expect(providerChip?.getAttribute('title')).toBe('Tryb danych: Demo lokalne')
  })
})
