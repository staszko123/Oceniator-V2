import { describe, expect, it } from 'vitest'
import { getVisibleNavigationItems } from './navigation'

const t = (key: string) => `translated:${key}`

describe('navigation visibility', () => {
  it('limits viewers to start and registry with viewer-specific labels', () => {
    const items = getVisibleNavigationItems('viewer', t)

    expect(items.map((item) => item.key)).toEqual(['start', 'registry'])
    expect(items.map((item) => item.label)).toEqual([
      'translated:nav.viewerPortal',
      'translated:nav.viewerAssessments',
    ])
  })

  it('keeps operational navigation for assessors', () => {
    expect(getVisibleNavigationItems('assessor', t).map((item) => item.key)).toEqual([
      'start',
      'form',
      'team',
      'registry',
    ])
  })

  it('keeps translated privileged navigation labels in stable order for admins', () => {
    const items = getVisibleNavigationItems('admin', t)

    expect(items.map((item) => item.key)).toEqual([
      'start',
      'form',
      'team',
      'registry',
      'dashboard',
      'reports',
      'admin',
    ])
    expect(items.map((item) => item.label)).toEqual([
      'translated:nav.start',
      'translated:nav.evaluation',
      'translated:nav.team',
      'translated:nav.registry',
      'translated:nav.dashboard',
      'translated:nav.reports',
      'translated:nav.admin',
    ])
  })
})
