import { readStorageItem } from '../utils/storage'

const demoDataKeys = [
  'oc_v2_admin',
  'oc_v2_assessments',
  'oc_v2_drafts',
  'oc_v2_users',
  'oc_v2_admin_history',
  'oc_v2_assessment_comments',
  'oc_v2_notifications',
  'oc_v2_user_preferences',
] as const

export interface DemoDataExport {
  exportedAt: string
  source: 'local-demo'
  version: 1
  data: Partial<Record<(typeof demoDataKeys)[number], unknown>>
}

function parseStoredValue(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export function buildDemoDataExport(now = new Date()): DemoDataExport {
  const data: DemoDataExport['data'] = {}
  demoDataKeys.forEach((key) => {
    const value = readStorageItem(key)
    if (value !== null) data[key] = parseStoredValue(value)
  })

  return {
    exportedAt: now.toISOString(),
    source: 'local-demo',
    version: 1,
    data,
  }
}

export function downloadDemoDataExport(now = new Date()): string {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    throw new Error('Eksport danych demo jest dostępny tylko w przeglądarce.')
  }

  const exportData = buildDemoDataExport(now)
  const fileDate = now.toISOString().slice(0, 10)
  const filename = `oceniator_demo_${fileDate}.json`
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
  return filename
}
