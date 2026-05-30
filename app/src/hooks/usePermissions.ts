import { useMemo } from 'react'
import { hasPermission } from '../config/permissions'
import type { Role } from '../domain/types'
import type { Permission } from '../types/permissions'

export function usePermissions(role: Role) {
  return useMemo(() => {
    const can = (permission: Permission) => hasPermission(role, permission)

    return {
      role,
      can,
      hasPermission: can,
      canCreateEvaluations: can('evaluations.create'),
      canEditEvaluations: can('evaluations.edit'),
      canReadEvaluations: can('evaluations.read'),
      canExportEvaluations: can('evaluations.export'),
      canReadUsers: can('users.read'),
      canEditUsers: can('users.edit'),
      canManageSettings: can('settings.edit'),
      canReadNotifications: can('notifications.read'),
    }
  }, [role])
}

