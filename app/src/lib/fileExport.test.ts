import { describe, expect, it } from 'vitest'
import { buildCsv } from './fileExport'

describe('buildCsv', () => {
  it('returns only the UTF-8 BOM for an empty export', () => {
    expect(buildCsv([])).toBe('\uFEFF')
  })

  it('quotes cells, escapes embedded quotes, and prefixes UTF-8 BOM', () => {
    expect(buildCsv([
      ['Specjalista', 'Wynik'],
      ['Anna "QA"', 93],
    ])).toBe('\uFEFF"Specjalista","Wynik"\r\n"Anna ""QA""","93"')
  })
})
