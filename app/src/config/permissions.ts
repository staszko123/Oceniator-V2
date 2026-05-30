import type { Role } from '../domain/types'
import type { Permission } from '../types/permissions'

export const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    'dashboard.read',
    'reports.read',
    'evaluations.read',
    'evaluations.create',
    'evaluations.edit',
    'evaluations.delete',
    'evaluations.export',
    'specialists.read',
    'specialists.edit',
    'teams.read',
    'users.read',
    'users.create',
    'users.edit',
    'users.delete',
    'settings.read',
    'settings.edit',
    'notifications.read',
    'notifications.manage',
  ],
  director: [
    'dashboard.read',
    'reports.read',
    'evaluations.read',
    'evaluations.create',
    'evaluations.edit',
    'evaluations.export',
    'specialists.read',
    'specialists.edit',
    'teams.read',
    'users.read',
    'users.edit',
    'settings.read',
    'settings.edit',
    'notifications.read',
  ],
  leader: [
    'dashboard.read',
    'reports.read',
    'evaluations.read',
    'evaluations.create',
    'evaluations.edit',
    'evaluations.export',
    'specialists.read',
    'teams.read',
    'notifications.read',
  ],
  assessor: [
    'evaluations.read',
    'evaluations.create',
    'evaluations.edit',
    'evaluations.export',
    'specialists.read',
    'notifications.read',
  ],
  viewer: [
    'dashboard.read',
    'reports.read',
    'evaluations.read',
    'specialists.read',
    'notifications.read',
  ],
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false
}

