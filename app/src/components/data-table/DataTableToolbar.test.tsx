// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DataTableToolbar } from './DataTableToolbar'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let activeContainer: HTMLDivElement | null = null
let activeRoot: ReturnType<typeof createRoot> | null = null

function renderToolbar(searchable = true) {
  activeContainer = document.createElement('div')
  document.body.appendChild(activeContainer)
  activeRoot = createRoot(activeContainer)

  act(() => {
    activeRoot!.render(
      <DataTableToolbar
        searchable={searchable}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        pageSize={10}
        onPageSizeChange={vi.fn()}
        pageSizeOptions={[10, 20, 50]}
        totalRows={20}
        visibleRows={10}
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
})

describe('DataTableToolbar', () => {
  it('keeps pagination when search is owned by the page', () => {
    renderToolbar(false)
    expect(document.querySelector('.data-table-search')).toBeNull()
    expect(document.querySelector('.data-table-page-size select')).not.toBeNull()
    expect(document.querySelector('.data-table-toolbar-meta span')?.getAttribute('aria-label')).toBe('Widoczne 10 z 20 wierszy')
  })

  it('exposes an explicit accessible label on the search input', () => {
    renderToolbar()

    const searchInput = document.querySelector('.data-table-search input')

    expect(searchInput?.getAttribute('aria-label')).toBe('Szukaj')
  })

  it('exposes a descriptive accessible label for the visible result count', () => {
    renderToolbar()

    const resultCount = document.querySelector('.data-table-toolbar-meta span')

    expect(resultCount?.getAttribute('aria-label')).toBe('Widoczne 10 z 20 wierszy')
  })
})
