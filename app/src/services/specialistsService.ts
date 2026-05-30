import type { AdminConfig, Specialist } from '../domain/types'

export function listActiveSpecialists(admin: AdminConfig): Specialist[] {
  return admin.specialists.filter((item) => item.active).sort((a, b) => a.name.localeCompare(b.name, 'pl'))
}

export function findSpecialist(admin: AdminConfig, name: string): Specialist | undefined {
  return admin.specialists.find((item) => item.name === name)
}

export function listSpecialistsForLeader(admin: AdminConfig, leader: string): Specialist[] {
  return admin.specialists.filter((item) => item.active && item.leader === leader).sort((a, b) => a.name.localeCompare(b.name, 'pl'))
}

