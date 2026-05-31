export function downloadFile(fileName: string, mime: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function buildCsv(rows: Array<Array<string | number>>) {
  return `\uFEFF${rows.map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n')}`
}
