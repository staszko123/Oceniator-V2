import { describe, expect, it } from 'vitest'
import { createSerializedWriter } from './serializedWriter'

describe('serialized workspace writes', () => {
  it('does not let an older snapshot finish after a newer one', async () => {
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const writes: number[] = []
    const save = createSerializedWriter(async (value: number) => {
      if (value === 1) await gate
      writes.push(value)
    })
    const first = save(1)
    const second = save(2)
    await Promise.resolve()
    expect(writes).toEqual([])
    release()
    await Promise.all([first, second])
    expect(writes).toEqual([1, 2])
  })
  it('reports a failed write and permits a subsequent retry', async () => {
    const writes: number[] = []
    const save = createSerializedWriter(async (value: number) => {
      if (!value) throw new Error('offline')
      writes.push(value)
    })
    await expect(save(0)).rejects.toThrow('offline')
    await save(1)
    expect(writes).toEqual([1])
  })
})
