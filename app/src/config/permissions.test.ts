import { describe, expect, it } from 'vitest'
import { hasPermission, rolePermissions } from './permissions'

describe('permissions config', () => {
  it('grants expected permissions for core roles', () => {
    expect(hasPermission('admin', 'users.read')).toBe(true)
    expect(hasPermission('leader', 'users.read')).toBe(false)
    expect(hasPermission('director', 'reports.read')).toBe(true)
    expect(hasPermission('viewer', 'evaluations.edit')).toBe(false)
  })

  it('keeps role permission sets explicit', () => {
    expect(rolePermissions.admin).toContain('evaluations.edit')
    expect(rolePermissions.leader).toContain('evaluations.create')
    expect(rolePermissions.director).toContain('dashboard.read')
  })
})
