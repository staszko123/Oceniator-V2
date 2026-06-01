// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { useTheme } from './theme'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let activeContainer: HTMLDivElement | null = null
let activeRoot: ReturnType<typeof createRoot> | null = null

function ThemeProbe() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button type="button" data-theme={theme} onClick={toggleTheme}>
      toggle
    </button>
  )
}

function renderProbe() {
  activeContainer = document.createElement('div')
  document.body.appendChild(activeContainer)
  activeRoot = createRoot(activeContainer)

  act(() => {
    activeRoot!.render(<ThemeProbe />)
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

describe('useTheme', () => {
  it('hydrates the stored theme and applies it to the root element', () => {
    window.localStorage.setItem('oceniator-theme', 'dark')

    const button = renderProbe()

    expect(button.dataset.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
  })

  it('toggles the theme class and persists the next preference', () => {
    const button = renderProbe()

    expect(button.dataset.theme).toBe('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)

    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(button.dataset.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
    expect(window.localStorage.getItem('oceniator-theme')).toBe('dark')
  })
})
