// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildCsv, downloadFile } from './fileExport'

describe('buildCsv', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('returns only the UTF-8 BOM for an empty export', () => {
    expect(buildCsv([])).toBe('\uFEFF')
  })

  it('quotes cells, escapes embedded quotes, and prefixes UTF-8 BOM', () => {
    expect(buildCsv([
      ['Specjalista', 'Wynik'],
      ['Anna "QA"', 93],
    ])).toBe('\uFEFF"Specjalista","Wynik"\r\n"Anna ""QA""","93"')
  })

  it('revokes temporary object URLs after triggering a download', () => {
    vi.useFakeTimers()

    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url')
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadFile('report.csv', 'text/csv', 'a,b,c')

    expect(createObjectUrl).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(document.body.querySelector('a')).toBeNull()

    vi.runAllTimers()

    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:test-url')
    expect(revokeObjectUrl).toHaveBeenCalledTimes(1)
  })
})
