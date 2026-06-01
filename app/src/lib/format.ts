/** Formatowanie wartości */

export function esc(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('pl-PL', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pl-PL').format(value)
}

export function clsx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
