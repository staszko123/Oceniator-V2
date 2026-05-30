import { describe, expect, it } from 'vitest'
import type { AdminConfig, ManagedUser } from './types'
import { describeAdminConfigSave, describeUserCreate, describeUserUpdate } from './audit'

const adminConfig: AdminConfig = {
  specialists: [{ id: '1', name: 'Anna Kowalska', leader: 'Lider 1', department: 'Sprzedaz', position: 'Specjalista', active: true }],
  departments: ['Sprzedaz'],
  positions: ['Specjalista'],
  leaders: ['Lider 1'],
  periods: [{ code: 'P1', name: 'P1', from: '01-01', to: '04-30' }],
  goals: { callsPerPeriod: 1, mailsPerPeriod: 2, systemsPerPeriod: 3, minAvg: 90, greatShare: 50 },
}

const user: ManagedUser = {
  id: 'user-1',
  email: 'user@example.com',
  fullName: 'Uzytkownik Testowy',
  role: 'leader',
  leaderScope: 'Lider 1',
  isActive: true,
  source: 'local',
}

describe('audit helpers', () => {
  it('describes admin config save', () => {
    expect(describeAdminConfigSave(adminConfig)).toContain('Zapisano konfiguracje panelu administratora')
    expect(describeAdminConfigSave(adminConfig)).toContain('1 specjalistow')
  })

  it('describes user create and update', () => {
    expect(describeUserCreate(user)).toBe('Utworzono konto: Uzytkownik Testowy (leader)')
    expect(describeUserUpdate(user)).toBe('Zaktualizowano konto: Uzytkownik Testowy (leader)')
  })
})
