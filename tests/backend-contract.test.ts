import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('backend contract', () => {
  it('keeps the SQL contract for viewer scope, audit and write guards', () => {
    const schema = read('supabase/schema.sql')
    const hardening = read('supabase/rls_hardening.sql')
    const edgeFunction = read('supabase/functions/admin-users/index.ts')

    expect(schema).toContain('create table if not exists public.admin_history')
    expect(schema).toContain('create or replace function public.guard_assessment_write()')
    expect(schema).toContain('create trigger trg_assessments_write_guard')
    expect(schema).toContain('current_profile_full_name()')
    expect(schema).toContain('current_profile_email()')
    expect(schema).toContain("and status = 'approved'")
    expect(schema).toContain('spec = public.current_profile_full_name()')
    expect(schema).toContain('spec = public.current_profile_email()')
    expect(schema).toContain('admin_history: admin i dyrektor wstawiaja')

    expect(hardening).toContain('admin_history: admin i dyrektor wstawiaja')
    expect(hardening).toContain("and status = 'approved'")
    expect(edgeFunction).toContain('admin_history')
    expect(edgeFunction).toContain('Utworzono konto:')
  })
})
