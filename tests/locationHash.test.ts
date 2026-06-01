import { describe, expect, it } from 'vitest'
import { buildLocationHash, parseLocationHash } from '../app/src/lib/locationHash'

describe('location hash routing', () => {
  it('parses and builds registry deeplinks', () => {
    const state = parseLocationHash('#registry?preset=decision&focus=assess-123')
    expect(state).toEqual({
      view: 'registry',
      registry: {
        preset: 'decision',
        focus: 'assess-123',
      },
    })
    expect(buildLocationHash(state)).toBe('registry?preset=decision&focus=assess-123')
  })

  it('parses and builds form deeplinks with type', () => {
    const state = parseLocationHash('#form?type=m')
    expect(state).toEqual({
      view: 'form',
      form: {
        type: 'm',
      },
    })
    expect(buildLocationHash(state)).toBe('form?type=m')
  })

  it('falls back to safe defaults for invalid hashes', () => {
    expect(parseLocationHash('#unknown?type=s')).toEqual({ view: 'start' })
    expect(parseLocationHash('#form?type=broken')).toEqual({ view: 'form', form: undefined })
    expect(buildLocationHash({ view: 'start' })).toBe('start')
  })

  it('builds the default registry preset when state is omitted', () => {
    expect(buildLocationHash({ view: 'registry' })).toBe('registry?preset=all')
    expect(buildLocationHash({ view: 'registry', registry: undefined })).toBe('registry?preset=all')
  })
})
