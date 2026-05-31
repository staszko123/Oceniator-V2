import { describe, expect, it } from 'vitest'
import { buildLocationHash, parseLocationHash } from './locationHash'

describe('location hash routing', () => {
  it('falls back to start for empty and unknown views', () => {
    expect(parseLocationHash('')).toEqual({ view: 'start' })
    expect(parseLocationHash('#unknown')).toEqual({ view: 'start' })
  })

  it('parses registry state with validated preset and optional focus', () => {
    expect(parseLocationHash('#registry?preset=recent&focus=abc-123')).toEqual({
      view: 'registry',
      registry: { preset: 'recent', focus: 'abc-123' },
    })

    expect(parseLocationHash('#registry?preset=invalid&focus=   ')).toEqual({
      view: 'registry',
      registry: { preset: 'all' },
    })
  })

  it('parses form state only for supported assessment types', () => {
    expect(parseLocationHash('#form?type=m')).toEqual({
      view: 'form',
      form: { type: 'm' },
    })

    expect(parseLocationHash('#form?type=x')).toEqual({
      view: 'form',
      form: undefined,
    })
  })

  it('builds stable hashes for registry and form views', () => {
    expect(buildLocationHash({ view: 'start' })).toBe('start')
    expect(buildLocationHash({ view: 'form', form: { type: 's' } })).toBe('form?type=s')
    expect(buildLocationHash({ view: 'registry', registry: { preset: 'decision', focus: 'row-9' } })).toBe(
      'registry?preset=decision&focus=row-9',
    )
  })

  it('round-trips supported location states', () => {
    const states = [
      { view: 'start' as const },
      { view: 'team' as const },
      { view: 'form' as const, form: { type: 'r' as const } },
      { view: 'registry' as const, registry: { preset: 'edited' as const, focus: 'assessment-17' } },
    ]

    states.forEach((state) => {
      expect(parseLocationHash(`#${buildLocationHash(state)}`)).toEqual(state)
    })
  })
})
