import { describe, expect, it } from 'vitest'
import { clsx, esc, formatCurrency, formatDate, formatNumber, formatPercent } from './format'

describe('format helpers', () => {
  it('escapes special HTML characters and nullish values', () => {
    expect(esc(`<tag attr="x">'&`)).toBe('&lt;tag attr=&quot;x&quot;&gt;&#039;&amp;')
    expect(esc(null)).toBe('')
  })

  it('formats rounded percentages and locale-aware numeric values', () => {
    expect(formatPercent(91.6)).toBe('92%')
    expect(formatCurrency(1234.5)).toBe('1234,50\u00A0zł')
    expect(formatNumber(1234567)).toBe('1\u00A0234\u00A0567')
  })

  it('handles valid, empty, and invalid date strings safely', () => {
    expect(formatDate('2026-05-30T08:00:00.000Z')).toBe('30.05.2026')
    expect(formatDate('')).toBe('-')
    expect(formatDate('   ')).toBe('-')
    expect(formatDate('not-a-date')).toBe('not-a-date')
  })

  it('joins only truthy class names', () => {
    expect(clsx('card', false, undefined, 'active', null, '')).toBe('card active')
  })
})
