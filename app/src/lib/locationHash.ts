import type { AssessmentType } from '../domain/types'
import type { ViewKey } from '../config/navigation'

export type RegistryIntentPreset = 'all' | 'decision' | 'recent' | 'edited'

export interface RegistryLocationState {
  preset: RegistryIntentPreset
  focus?: string
}

export interface FormLocationState {
  type?: AssessmentType
}

export interface AppLocationState {
  view: ViewKey
  registry?: RegistryLocationState
  form?: FormLocationState
}

const VIEW_KEYS = new Set<ViewKey>(['start', 'form', 'team', 'registry', 'dashboard', 'reports', 'admin'])
const REGISTRY_PRESETS = new Set<RegistryIntentPreset>(['all', 'decision', 'recent', 'edited'])
const FORM_TYPES = new Set<AssessmentType>(['r', 'm', 's'])

function isViewKey(value: string | null): value is ViewKey {
  return Boolean(value && VIEW_KEYS.has(value as ViewKey))
}

function isRegistryPreset(value: string | null): value is RegistryIntentPreset {
  return Boolean(value && REGISTRY_PRESETS.has(value as RegistryIntentPreset))
}

function isAssessmentType(value: string | null): value is AssessmentType {
  return Boolean(value && FORM_TYPES.has(value as AssessmentType))
}

export function parseLocationHash(hash: string): AppLocationState {
  const normalizedHash = hash.replace(/^#/, '')
  if (!normalizedHash) return { view: 'start' }

  const [rawView, rawQuery = ''] = normalizedHash.split('?', 2)
  const view = isViewKey(rawView) ? rawView : 'start'

  const params = new URLSearchParams(rawQuery)
  if (view === 'registry') {
    const rawPreset = params.get('preset')
    const preset: RegistryIntentPreset = isRegistryPreset(rawPreset) ? rawPreset : 'all'
    const focus = params.get('focus')?.trim() || undefined

    return {
      view,
      registry: {
        preset,
        ...(focus ? { focus } : {}),
      },
    }
  }

  if (view === 'form') {
    const rawType = params.get('type')
    const type = isAssessmentType(rawType) ? rawType : undefined
    return {
      view,
      form: type ? { type } : undefined,
    }
  }

  return { view }
}

export function buildLocationHash(state: AppLocationState): string {
  if (state.view === 'form') {
    const params = new URLSearchParams()
    if (state.form?.type) {
      params.set('type', state.form.type)
    }
    const query = params.toString()
    return query ? `${state.view}?${query}` : state.view
  }

  if (state.view !== 'registry') return state.view

  const params = new URLSearchParams()
  params.set('preset', state.registry?.preset || 'all')
  if (state.registry?.focus) {
    params.set('focus', state.registry.focus)
  }

  const query = params.toString()
  return query ? `${state.view}?${query}` : state.view
}

export function readLocationState(): AppLocationState {
  if (typeof window === 'undefined') return { view: 'start' }
  return parseLocationHash(window.location.hash)
}
