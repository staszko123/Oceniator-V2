import type { AdminConfig, ManagedUser } from './types'

function identity(user: ManagedUser | { email: string; login?: string; fullName: string }): string {
  return user.fullName || user.email || user.login || 'uzytkownik'
}

export function describeAdminConfigSave(config: AdminConfig): string {
  return [
    'Zapisano konfiguracje panelu administratora',
    `${config.specialists.length} specjalistow`,
    `${config.departments.length} dzialow`,
    `${config.positions.length} stanowisk`,
    `${config.periods.length} okresow`,
  ].join(' | ')
}

export function describeUserCreate(user: ManagedUser): string {
  return `Utworzono konto: ${identity(user)} (${user.role})`
}

export function describeUserUpdate(user: ManagedUser): string {
  return `Zaktualizowano konto: ${identity(user)} (${user.role})`
}
