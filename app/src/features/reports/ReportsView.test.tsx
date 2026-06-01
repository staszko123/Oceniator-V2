// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ReportsView from './ReportsView'
import type { Assessment } from '../../domain/types'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const assessments: Assessment[] = [
  {
    id: 'assessment-1',
    type: 'r',
    spec: 'Jan Kowalski',
    stand: 'Specjalista',
    dzial: 'Operacje',
    oce: 'Lider 1',
    data: '2026-05-20',
    period: '2026-05',
    avgFinal: 84,
    secAvg: {},
    contactResults: [],
    rating: 'good',
    notes: '',
    contactCount: 1,
    ids: ['CASE-1'],
    snapshotScores: {},
    snapshotNotes: {},
    gold: [],
    goldDesc: '',
    status: 'approved',
    statusHistory: [],
    createdAt: '2026-05-20T08:00:00.000Z',
    leaderScope: 'Lider 1',
  },
]

let activeContainer: HTMLDivElement | null = null
let activeRoot: ReturnType<typeof createRoot> | null = null

function renderReportsView() {
  activeContainer = document.createElement('div')
  document.body.appendChild(activeContainer)
  activeRoot = createRoot(activeContainer)

  act(() => {
    activeRoot!.render(
      <ReportsView
        assessments={assessments}
        setView={vi.fn()}
        openRegistry={vi.fn()}
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

describe('ReportsView', () => {
  it('associates the secondary hero action group with its helper hint', () => {
    renderReportsView()

    const actionGroup = document.querySelector('.report-hero-secondary')
    const hint = document.querySelector('#report-tools-hint')

    expect(actionGroup?.getAttribute('role')).toBe('group')
    expect(actionGroup?.getAttribute('aria-describedby')).toBe('report-tools-hint')
    expect(hint?.textContent).toBe('Tryby, eksporty i tabele pomocnicze są niżej.')
  })
})
