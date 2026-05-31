import { BarChart3, ClipboardCheck, FileBarChart, LayoutDashboard, PhoneCall, Settings, ShieldCheck, Users } from 'lucide-react'
import type { Role } from '../domain/types'
import type { Permission } from '../types/permissions'
import { hasPermission } from './permissions'

export type ViewKey = 'start' | 'form' | 'team' | 'registry' | 'dashboard' | 'reports' | 'admin'

export interface NavigationItemConfig {
  key: ViewKey
  labelKey: string
  icon: typeof LayoutDashboard
  permission?: Permission
  allowRoles?: Role[]
  viewerLabelKey?: string
}

export const routeConfig: Record<ViewKey, { eyebrowKey: string; descriptionKey: string; viewerEyebrowKey?: string; viewerDescriptionKey?: string }> = {
  start: {
    eyebrowKey: 'route.start.eyebrow',
    descriptionKey: 'route.start.description',
    viewerEyebrowKey: 'route.viewer.eyebrow',
    viewerDescriptionKey: 'route.viewer.startDescription',
  },
  form: {
    eyebrowKey: 'route.form.eyebrow',
    descriptionKey: 'route.form.description',
  },
  team: {
    eyebrowKey: 'route.team.eyebrow',
    descriptionKey: 'route.team.description',
  },
  registry: {
    eyebrowKey: 'route.registry.eyebrow',
    descriptionKey: 'route.registry.description',
    viewerEyebrowKey: 'route.viewer.eyebrow',
    viewerDescriptionKey: 'route.viewer.registryDescription',
  },
  dashboard: {
    eyebrowKey: 'route.dashboard.eyebrow',
    descriptionKey: 'route.dashboard.description',
  },
  reports: {
    eyebrowKey: 'route.reports.eyebrow',
    descriptionKey: 'route.reports.description',
  },
  admin: {
    eyebrowKey: 'route.admin.eyebrow',
    descriptionKey: 'route.admin.description',
  },
}

export const navigationConfig: NavigationItemConfig[] = [
  { key: 'start', labelKey: 'nav.start', icon: LayoutDashboard, viewerLabelKey: 'nav.viewerPortal' },
  { key: 'form', labelKey: 'nav.evaluation', icon: PhoneCall, permission: 'evaluations.create' },
  { key: 'team', labelKey: 'nav.team', icon: Users, permission: 'teams.read' },
  { key: 'registry', labelKey: 'nav.registry', icon: ClipboardCheck, permission: 'evaluations.read', viewerLabelKey: 'nav.viewerAssessments' },
  { key: 'dashboard', labelKey: 'nav.dashboard', icon: BarChart3, permission: 'dashboard.read' },
  { key: 'reports', labelKey: 'nav.reports', icon: FileBarChart, permission: 'reports.read' },
  { key: 'admin', labelKey: 'nav.admin', icon: Settings, permission: 'users.read' },
]

export function getVisibleNavigationItems(
  role: Role,
  t: (key: string, fallback?: string) => string,
): Array<{ key: ViewKey; label: string; icon: typeof LayoutDashboard }> {
  if (!hasPermission(role, 'teams.read')) {
    return navigationConfig
      .filter((item) => item.key === 'start' || item.key === 'registry')
      .map((item) => ({
        key: item.key,
        label: t(item.viewerLabelKey || item.labelKey),
        icon: item.icon,
      }))
  }

  return navigationConfig
    .filter((item) => !item.permission || hasPermission(role, item.permission))
    .map((item) => ({
      key: item.key,
      label: t(item.labelKey),
      icon: item.icon,
    }))
}

export const viewIconMap: Record<ViewKey, typeof LayoutDashboard> = {
  start: LayoutDashboard,
  form: PhoneCall,
  team: Users,
  registry: ClipboardCheck,
  dashboard: BarChart3,
  reports: FileBarChart,
  admin: ShieldCheck,
}
