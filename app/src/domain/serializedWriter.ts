/** Keep complete workspace snapshots in order; a failed write does not poison retries. */
export function createSerializedWriter<T>(write: (value: T) => Promise<void>) {
  let tail = Promise.resolve()
  return (value: T): Promise<void> => {
    const result = tail.then(() => write(value))
    tail = result.catch(() => undefined)
    return result
  }
}
