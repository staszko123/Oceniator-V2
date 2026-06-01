// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { ThemeToggle } from './ThemeToggle'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let activeContainer: HTMLDivElement | null = null
let activeRoot: ReturnType<typeof createRoot> | null = null

function renderToggle() {
  activeContainer = document.createElement('div')
  document.body.appendChild(activeContainer)
  activeRoot = createRoot(activeContainer)

  act(() => {
    activeRoot!.render(<ThemeToggle />)
  })

  return activeContainer.querySelector('button') as HTMLButtonElement
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

describe('ThemeToggle', () => {
  it('renders the current theme action as title and aria-label', () => {
    window.localStorage.setItem('oceniator-theme', 'dark')

    const button = renderToggle()

    expect(button.title).toBe('Tryb jasny')
    expect(button.getAttribute('aria-label')).toBe('Tryb jasny')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('updates the accessible label after toggling the theme', () => {
    const button = renderToggle()

    expect(button.title).toBe('Tryb ciemny')
    expect(button.getAttribute('aria-label')).toBe('Tryb ciemny')

    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(button.title).toBe('Tryb jasny')
    expect(button.getAttribute('aria-label')).toBe('Tryb jasny')
    expect(window.localStorage.getItem('oceniator-theme')).toBe('dark')
  })
})
