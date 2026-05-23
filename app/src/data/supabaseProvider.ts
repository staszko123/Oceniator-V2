import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { LocalDataProvider } from './localProvider'
import type { AdminConfig, Assessment, AssessmentDraft, AssessmentType, DataProvider, ManagedUser, Role, UserProfile } from '../domain/types'

const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || 'https://oemqmxqngwtxmhlmwubq.supabase.co',
  anonKey:
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lbXFteHFuZ3d0eG1obG13dWJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5ODk1MTMsImV4cCI6MjA5MzU2NTUxM30.upbHqVN4hIb5wF3rTUY7l91M1k6DL7s_60i1HePK-OE',
  enabled: import.meta.env.VITE_SUPABASE_ENABLED !== 'false',
}
function mapRow(row: Record<string, unknown>): Assessment {
  const notes = (row.notes || {}) as { general?: string; perContact?: Record<string, string[]> }
  const fallbackAt = String(row.created_at || row.assessment_date || '')
  const rawHistory = (row.status_history || []) as Assessment['statusHistory']
  return {
    id: String(row.id),
    type: row.type as Assessment['type'],
    spec: String(row.spec || ''),
    stand: String(row.stand || ''),
    dzial: String(row.dzial || ''),
    oce: String(row.oce || ''),
    data: String(row.assessment_date || ''),
    period: String(row.period || ''),
    avgFinal: Number(row.avg_final || 0),
    secAvg: {},
    contactResults: [],
    rating: row.rating as Assessment['rating'],
    notes: notes.general || '',
    contactCount: Number(row.contact_count || 3),
    ids: (row.contact_ids || []) as string[],
    snapshotScores: (row.scores || {}) as Assessment['snapshotScores'],
    snapshotNotes: (notes.perContact || {}) as Assessment['snapshotNotes'],
    gold: (row.gold || []) as number[],
    goldDesc: String(row.gold_desc || ''),
    status: (row.status || 'submitted') as Assessment['status'],
    statusHistory: rawHistory.length ? rawHistory : [{
      status: (row.status || 'submitted') as Assessment['status'],
      at: fallbackAt,
      by: String(row.oce || 'system'),
      note: 'Utworzono kart\u0119 bazow\u0105',
    }],
    createdAt: String(row.created_at || ''),
    leaderScope: String(row.leader_scope || row.oce || ''),
  }
}

function mapAssessment(assessment: Assessment, user: UserProfile | null): Record<string, unknown> {
  return {
    id: assessment.id,
    type: assessment.type,
    spec: assessment.spec,
    stand: assessment.stand,
    dzial: assessment.dzial,
    oce: assessment.oce,
    assessment_date: assessment.data,
    period: assessment.period,
    avg_final: assessment.avgFinal,
    rating: assessment.rating,
    scores: assessment.snapshotScores,
    gold: assessment.gold,
    contact_ids: assessment.ids,
    notes: { general: assessment.notes, perContact: assessment.snapshotNotes },
    gold_desc: assessment.goldDesc,
    contact_count: assessment.contactCount,
    status: assessment.status,
    status_history: assessment.statusHistory || [],
    leader_scope: assessment.leaderScope || user?.leaderScope || assessment.oce,
    created_by: user?.source === 'supabase' ? user.id : null,
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export class SupabaseDataProvider implements DataProvider {
  mode = 'supabase' as const
  private client: SupabaseClient
  private local = new LocalDataProvider()
  private currentUser: UserProfile | null = null

  constructor() {
    this.client = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  }

  static isConfigured(): boolean {
    return Boolean(supabaseConfig.enabled && supabaseConfig.url && supabaseConfig.anonKey)
  }

  async signIn(email: string, password: string): Promise<UserProfile> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (!data.user) throw new Error('Brak uzytkownika w sesji.')
    const profile = await this.loadProfile(data.user.id, data.user.email || '')
    this.currentUser = profile
    return profile
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut()
    this.currentUser = null
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    const { data } = await this.client.auth.getSession()
    if (!data.session?.user) return null
    const profile = await this.loadProfile(data.session.user.id, data.session.user.email || '')
    this.currentUser = profile
    return profile
  }

  async loadAdmin(): Promise<AdminConfig> {
    const fallback = await this.local.loadAdmin()
    const [goals, specialists, departments, positions, periods] = await Promise.all([
      this.client.from('goals').select('*').eq('id', '00000000-0000-0000-0000-000000000001').maybeSingle(),
      this.client.from('specialists').select('*').order('sort_order'),
      this.client.from('departments').select('*').order('sort_order'),
      this.client.from('positions').select('*').order('sort_order'),
      this.client.from('periods').select('*').order('sort_order'),
    ])

    if (specialists.error) return fallback

    return {
      goals: goals.data
        ? {
            callsPerPeriod: goals.data.calls_per_period,
            mailsPerPeriod: goals.data.mails_per_period,
            systemsPerPeriod: goals.data.systems_per_period,
            minAvg: goals.data.min_avg,
            greatShare: goals.data.great_share,
          }
        : fallback.goals,
      specialists: (specialists.data || []).map((item) => ({
        id: item.id,
        name: item.name,
        leader: item.leader_scope || '',
        department: item.department || '',
        position: item.position || '',
        active: item.is_active !== false,
      })),
      departments: (departments.data || []).map((item) => item.name),
      positions: (positions.data || []).map((item) => item.name),
      leaders: [...new Set((specialists.data || []).map((item) => item.leader_scope).filter(Boolean))],
      periods: (periods.data || []).map((item) => ({
        code: item.code,
        name: item.name,
        from: item.date_from,
        to: item.date_to,
      })),
    }
  }

  async saveAdmin(config: AdminConfig): Promise<void> {
    await this.local.saveAdmin(config)
    const goals = config.goals
    await Promise.all([
      this.client
        .from('goals')
        .update({
          calls_per_period: goals.callsPerPeriod,
          mails_per_period: goals.mailsPerPeriod,
          systems_per_period: goals.systemsPerPeriod,
          min_avg: goals.minAvg,
          great_share: goals.greatShare,
        })
        .eq('id', '00000000-0000-0000-0000-000000000001'),
      config.departments.length
        ? this.client.from('departments').upsert(
            config.departments.map((name, index) => ({ name, is_active: true, sort_order: index })),
            { onConflict: 'name' },
          )
        : Promise.resolve({ error: null }),
      config.positions.length
        ? this.client.from('positions').upsert(
            config.positions.map((name, index) => ({ name, is_active: true, sort_order: index })),
            { onConflict: 'name' },
          )
        : Promise.resolve({ error: null }),
      config.specialists.length
        ? this.client.from('specialists').upsert(
            config.specialists.map((specialist, index) => ({
              ...(isUuid(specialist.id) ? { id: specialist.id } : {}),
              name: specialist.name,
              leader_scope: specialist.leader,
              department: specialist.department,
              position: specialist.position,
              is_active: specialist.active,
              sort_order: index,
            })),
            { onConflict: 'name' },
          )
        : Promise.resolve({ error: null }),
    ]).then((results) => {
      const failed = results.find((result) => result.error)
      if (failed?.error) throw failed.error
    })

    const existingPeriods = await this.client.from('periods').select('id,code')
    if (existingPeriods.error) throw existingPeriods.error
    await Promise.all(config.periods.map((period, index) => {
      const existing = (existingPeriods.data || []).find((item) => item.code === period.code)
      const row = {
        code: period.code,
        name: period.name,
        date_from: period.from,
        date_to: period.to,
        sort_order: index,
      }
      return existing
        ? this.client.from('periods').update(row).eq('id', existing.id)
        : this.client.from('periods').insert(row)
    })).then((results) => {
      const failed = results.find((result) => result.error)
      if (failed?.error) throw failed.error
    })
  }

  async listUsers(): Promise<ManagedUser[]> {
    const { data, error } = await this.client
      .from('profiles')
      .select('id,email,full_name,role,leader_scope,is_active,created_at')
      .order('email', { ascending: true })
    if (error) throw error
    return (data || []).map((item) => ({
      id: item.id,
      email: item.email || '',
      fullName: item.full_name || item.email || '',
      role: (item.role || 'viewer') as Role,
      leaderScope: item.leader_scope || '',
      isActive: item.is_active !== false,
      source: 'supabase' as const,
      createdAt: item.created_at || '',
    }))
  }

  async updateUser(user: ManagedUser): Promise<ManagedUser> {
    const payload = {
      full_name: user.fullName,
      role: user.role,
      leader_scope: user.leaderScope || null,
      is_active: user.isActive !== false,
    }
    if (typeof this.client.rpc === 'function') {
      const rpc = await this.client.rpc('admin_update_profile', {
        target_id: user.id,
        target_full_name: payload.full_name,
        target_role: payload.role,
        target_leader_scope: payload.leader_scope || '',
        target_is_active: payload.is_active,
      })
      if (!rpc.error) return { ...user, source: 'supabase' }
    }
    const { error } = await this.client.from('profiles').update(payload).eq('id', user.id)
    if (error) throw error
    return { ...user, source: 'supabase' }
  }

  async createUser(user: ManagedUser): Promise<ManagedUser> {
    const { data: sessionData } = await this.client.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) throw new Error('Brak aktywnej sesji Supabase.')
    const response = await fetch(`${supabaseConfig.url.replace(/\/$/, '')}/functions/v1/admin-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseConfig.anonKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
        full_name: user.fullName,
        role: user.role,
        leader_scope: user.leaderScope,
        is_active: user.isActive !== false,
      }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.error || `Supabase Edge Function HTTP ${response.status}`)
    return {
      ...user,
      id: body.id || body.user?.id || user.email,
      source: 'supabase',
      password: '',
      createdAt: new Date().toISOString(),
    }
  }

  async loadAssessments(): Promise<Assessment[]> {
    const { data, error } = await this.client.from('assessments').select('*').order('assessment_date', { ascending: false })
    if (error) throw error
    return (data || []).map(mapRow)
  }

  async saveAssessment(assessment: Assessment): Promise<void> {
    const { error } = await this.client.from('assessments').upsert(mapAssessment(assessment, this.currentUser), { onConflict: 'id' })
    if (error) throw error
  }

  async updateAssessment(assessment: Assessment): Promise<void> {
    await this.saveAssessment(assessment)
  }

  async loadDrafts(): Promise<Record<AssessmentType, AssessmentDraft | undefined>> {
    return this.local.loadDrafts()
  }

  async saveDrafts(drafts: Record<AssessmentType, AssessmentDraft | undefined>): Promise<void> {
    await this.local.saveDrafts(drafts)
  }

  private async loadProfile(userId: string, email: string): Promise<UserProfile> {
    const { data, error } = await this.client
      .from('profiles')
      .select('id,email,full_name,role,leader_scope,is_active')
      .eq('id', userId)
      .single()

    if (error) throw error
    if (data.is_active === false) throw new Error('Konto jest nieaktywne.')

    return {
      id: data.id,
      email: data.email || email,
      fullName: data.full_name || email,
      role: (data.role || 'viewer') as Role,
      leaderScope: data.leader_scope || '',
      isActive: data.is_active !== false,
      source: 'supabase',
    }
  }
}

let localProviderInstance: LocalDataProvider | null = null
let supabaseProviderInstance: SupabaseDataProvider | null = null

export function createProvider(forceLocal = false): DataProvider {
  if (forceLocal || localStorage.getItem('oc_v2_provider') === 'local') {
    localProviderInstance ||= new LocalDataProvider()
    return localProviderInstance
  }
  if (SupabaseDataProvider.isConfigured()) {
    supabaseProviderInstance ||= new SupabaseDataProvider()
    return supabaseProviderInstance
  }
  localProviderInstance ||= new LocalDataProvider()
  return localProviderInstance
}
