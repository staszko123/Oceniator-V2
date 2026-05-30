import { beforeEach, describe, expect, it, vi } from 'vitest'

const storage = new Map<string, string>()

vi.mock('../utils/storage', () => ({
  readStorageItem: (key: string) => storage.get(key) ?? null,
}))

import { buildDemoDataExport } from './demoExport'

describe('demo export', () => {
  beforeEach(() => {
    storage.clear()
  })

  it('exports only the stored demo payloads with metadata', () => {
    storage.set('oc_v2_admin', JSON.stringify({ goals: { minAvg: 91 } }))
    storage.set('oc_v2_notifications', JSON.stringify([{ id: 'n-1', title: 'Demo' }]))

    const result = buildDemoDataExport(new Date('2026-05-30T08:00:00.000Z'))

    expect(result.exportedAt).toBe('2026-05-30T08:00:00.000Z')
    expect(result.source).toBe('local-demo')
    expect(result.version).toBe(1)
    expect(result.data['oc_v2_admin']).toEqual({ goals: { minAvg: 91 } })
    expect(result.data['oc_v2_notifications']).toEqual([{ id: 'n-1', title: 'Demo' }])
  })
})
