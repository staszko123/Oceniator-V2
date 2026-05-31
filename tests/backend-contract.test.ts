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
    const supabaseProvider = read('app/src/data/supabaseProvider.ts')
    const localProvider = read('app/src/data/localProvider.ts')
    const settingsService = read('app/src/services/settingsService.ts')
    const vercelConfig = read('vercel.json')

    expect(schema).toContain('create table if not exists public.admin_history')
    expect(schema).toContain('create table if not exists public.user_drafts')
    expect(schema).toContain('create table if not exists public.assessment_comments')
    expect(schema).toContain('create table if not exists public.notifications')
    expect(schema).toContain('create table if not exists public.user_preferences')
    expect(schema).toContain('primary key (user_id, key)')
    expect(schema).toContain('trg_user_drafts_updated')
    expect(schema).toContain('trg_assessment_comments_updated')
    expect(schema).toContain('trg_user_preferences_updated')
    expect(schema).toContain('create or replace function public.guard_assessment_write()')
    expect(schema).toContain('create trigger trg_assessments_write_guard')
    expect(schema).toContain('current_profile_full_name()')
    expect(schema).toContain('current_profile_email()')
    expect(schema).toContain('and is_active = true')
    expect(schema).toContain("and status = 'approved'")
    expect(schema).toContain('spec = public.current_profile_full_name()')
    expect(schema).toContain('spec = public.current_profile_email()')
    expect(hardening).toContain('create or replace function public.can_access_assessment')
    expect(schema).toContain('admin_history: admin i dyrektor wstawiaja')
    expect(schema).toContain('user_drafts: owner read')
    expect(schema).toContain('assessment_comments: read with assessment access')
    expect(schema).toContain('notifications: owner read')
    expect(schema).toContain('user_preferences: owner read')

    expect(hardening).toContain('admin_history: admin i dyrektor wstawiaja')
    expect(hardening).toContain('and is_active = true')
    expect(hardening).toContain("and status = 'approved'")
    expect(hardening).toContain('user_drafts: owner update')
    expect(hardening).toContain('assessment_comments: scoped insert')
    expect(hardening).toContain('notifications: owner update')
    expect(hardening).toContain('user_preferences: owner update')
    expect(edgeFunction).toContain('admin_history')
    expect(edgeFunction).toContain('Utworzono konto:')
    expect(supabaseProvider).toContain('signInWithOAuth')
    expect(supabaseProvider).toContain("loadUserPreference<T = unknown>(key: string)")
    expect(supabaseProvider).toContain("saveUserPreference<T = unknown>(key: string, value: T)")
    expect(supabaseProvider).toContain('assessment_comments')
    expect(supabaseProvider).toContain('user_preferences')
    expect(settingsService).toContain('VITE_APP_ENV')
    expect(settingsService).toContain('getOAuthRedirectUrl')
    expect(localProvider).toContain('loadUserPreference<T = unknown>(key: string)')
    expect(localProvider).toContain('saveUserPreference<T = unknown>(key: string, value: T)')
    expect(vercelConfig).toContain('buildCommand')
    expect(vercelConfig).toContain('outputDirectory')
  })
})
