export interface DashboardMetric {
  key: string
  label: string
  value: string | number
  hint?: string
  tone?: 'neutral' | 'positive' | 'warning' | 'danger'
  suffix?: string
}

