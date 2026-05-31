// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ContextMenu } from './ContextMenu'
import type { TableAction } from '../../types/table'

type Row = {
  id: string
}

const actions: Array<TableAction<Row>> = [
  {
    key: 'inspect',
    label: 'Inspect',
    onSelect: () => undefined,
  },
]

const openState = {
  x: 120,
  y: 80,
  row: { id: 'row-1' },
}

let activeContainer: HTMLDivElement | null = null
let activeRoot: ReturnType<typeof createRoot> | null = null

function renderMenu(onClose: () => void, state: typeof openState | null = openState) {
  activeContainer = document.createElement('div')
  document.body.appendChild(activeContainer)
  activeRoot = createRoot(activeContainer)

  act(() => {
    activeRoot!.render(
      <ContextMenu
        state={state}
        actions={actions}
        role="admin"
        onClose={onClose}
      />,
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
  document.body.innerHTML = ''
})

describe('ContextMenu', () => {
  it('closes when Escape is pressed while open', () => {
    const onClose = vi.fn()

    renderMenu(onClose)

    expect(document.body.querySelector('[role="menu"]')).not.toBeNull()

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not register Escape handling when closed', () => {
    const onClose = vi.fn()

    renderMenu(onClose, null)

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })

    expect(onClose).not.toHaveBeenCalled()
  })
})
