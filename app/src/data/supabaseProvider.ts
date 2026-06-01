import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { DemoDataProvider } from './localProvider'
import { describeAdminConfigSave, describeUserCreate, describeUserUpdate } from '../domain/audit'
import { canAdminRole, scopeAssessmentsForUser } from '../domain/access'
import { getSafeErrorContext } from '../domain/errors'
import type { AdminConfig, AdminHistoryEntry, Assessment, AssessmentComment, AssessmentDraft, AssessmentType, DataProvider, ManagedUser, Role, UserProfile } from '../domain/types'
import type { Notification } from '../types/notification'
import { assertCanAdmin, assertCanEditAssessment } from '../lib/security'
import { getOAuthRedirectUrl, getProviderMode, isLocalDemoEnabled } from '../services/settingsService'

const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
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

function mapAssessment(assessment: Assessment): Record<string, unknown> {
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
    leader_scope: assessment.leaderScope || assessment.oce,
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function isMissingTableError(error: unknown, tableName: string): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: string; message?: string }
  const message = (candidate.message || '').toLowerCase()
  return candidate.code === '42P01'
    || message.includes(`could not find the table 'public.${tableName}'`)
    || message.includes(`relation "public.${tableName}" does not exist`)
}

export class SupabaseDataProvider implements DataProvider {
  mode = 'supabase' as const
  private _client: SupabaseClient | null = null
  private currentUser: UserProfile | null = null

  constructor() {
    if (SupabaseDataProvider.isConfigured()) {
      this._client = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    }
  }

  static isConfigured(): boolean {
    return Boolean(supabaseConfig.enabled && supabaseConfig.url && supabaseConfig.anonKey)
  }

  private get client(): SupabaseClient {
    if (!this._client) throw new Error('Supabase nie jest skonfigurowane.')
    return this._client
  }

  async signIn(email: string, password: string): Promise<UserProfile> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (!data.user) throw new Error('Brak uzytkownika w sesji.')
    const profile = await this.loadProfile(data.user.id, data.user.email || '')
    this.currentUser = profile
    return profile
  }

  async signInWithGoogle(redirectTo = getOAuthRedirectUrl()): Promise<void> {
    const { error } = await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo || undefined,
        queryParams: {
          prompt: 'select_account',
        },
      },
    })
    if (error) throw error
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
    try {
      const [goals, specialists, departments, positions, periods] = await Promise.all([
        this.client.from('goals').select('*').eq('id', '00000000-0000-0000-0000-000000000001').maybeSingle(),
        this.client.from('specialists').select('*').order('sort_order'),
        this.client.from('departments').select('*').order('sort_order'),
        this.client.from('positions').select('*').order('sort_order'),
        this.client.from('periods').select('*').order('sort_order'),
      ])

      const failed = [goals, specialists, departments, positions, periods].find((result) => result.error)
      if (failed?.error) throw failed.error

      return {
        goals: goals.data
          ? {
              callsPerPeriod: goals.data.calls_per_period,
              mailsPerPeriod: goals.data.mails_per_period,
              systemsPerPeriod: goals.data.systems_per_period,
              minAvg: goals.data.min_avg,
              greatShare: goals.data.great_share,
            }
          : {
              callsPerPeriod: 9,
              mailsPerPeriod: 9,
              systemsPerPeriod: 9,
              minAvg: 92,
              greatShare: 60,
            },
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
    } catch (error) {
      console.warn('Supabase admin load failed:', getSafeErrorContext(error))
      throw error
    }
  }

  async saveAdmin(config: AdminConfig): Promise<void> {
    if (!this.currentUser) throw new Error('Brak aktywnej sesji Supabase.')
    assertCanAdmin(this.currentUser, 'Brak dostepu do zapisu konfiguracji administratora.')
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

    await this.recordAdminHistory(describeAdminConfigSave(config))
  }

  async loadAdminHistory(): Promise<AdminHistoryEntry[]> {
    if (!this.currentUser || !canAdminRole(this.currentUser.role)) return []
    try {
      const { data, error } = await this.client
        .from('admin_history')
        .select('id,description,changed_by,changed_at')
        .order('changed_at', { ascending: false })
        .limit(12)
      if (error) return []
      return (data || []).map((item) => ({
        id: item.id,
        description: item.description,
        changedBy: item.changed_by,
        changedAt: item.changed_at,
      }))
    } catch (error) {
      console.warn('Supabase admin history load failed:', getSafeErrorContext(error))
      return []
    }
  }

  async listUsers(): Promise<ManagedUser[]> {
    if (!this.currentUser || !canAdminRole(this.currentUser.role)) return []
    try {
      const { data, error } = await this.client
        .from('profiles')
        .select('id,email,full_name,role,leader_scope,is_active,created_at')
        .order('email', { ascending: true })
      if (error) return []
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
    } catch (error) {
      console.warn('Supabase users load failed:', getSafeErrorContext(error))
      return []
    }
  }

  async updateUser(user: ManagedUser): Promise<ManagedUser> {
    if (!this.currentUser) throw new Error('Brak aktywnej sesji Supabase.')
    assertCanAdmin(this.currentUser, 'Brak dostepu do edycji uzytkownikow.')
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
      if (!rpc.error) {
        await this.recordAdminHistory(describeUserUpdate({ ...user, source: 'supabase' }))
        return { ...user, source: 'supabase' }
      }
    }
    const { error } = await this.client.from('profiles').update(payload).eq('id', user.id)
    if (error) throw error
    await this.recordAdminHistory(describeUserUpdate({ ...user, source: 'supabase' }))
    return { ...user, source: 'supabase' }
  }

  async createUser(user: ManagedUser): Promise<ManagedUser> {
    if (!this.currentUser) throw new Error('Brak aktywnej sesji Supabase.')
    assertCanAdmin(this.currentUser, 'Brak dostepu do tworzenia uzytkownikow.')
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
    await this.recordAdminHistory(describeUserCreate({ ...user, source: 'supabase' }))
    return {
      ...user,
      id: body.id || body.user?.id || user.email,
      source: 'supabase',
      password: '',
      createdAt: new Date().toISOString(),
    }
  }

  async loadAssessments(): Promise<Assessment[]> {
    try {
      const { data, error } = await this.client.from('assessments').select('*').order('assessment_date', { ascending: false })
      if (error) throw error
      const mapped = (data || []).map(mapRow)
      return this.currentUser ? scopeAssessmentsForUser(mapped, this.currentUser) : mapped
    } catch (error) {
      console.warn('Supabase assessments load failed:', getSafeErrorContext(error))
      throw error
    }
  }

  async saveAssessment(assessment: Assessment): Promise<void> {
    if (!this.currentUser) throw new Error('Brak aktywnej sesji Supabase.')
    assertCanEditAssessment(this.currentUser, assessment, 'Brak dostepu do zapisu tej karty.')
    const { data: existing, error: existingError } = await this.client
      .from('assessments')
      .select('created_by')
      .eq('id', assessment.id)
      .maybeSingle()
    if (existingError) throw existingError
    const payload = mapAssessment(assessment)
    if (existing?.created_by) {
      payload.created_by = existing.created_by
    } else {
      payload.created_by = this.currentUser.id
    }
    const { error } = await this.client.from('assessments').upsert(payload, { onConflict: 'id' })
    if (error) throw error
  }

  async updateAssessment(assessment: Assessment): Promise<void> {
    if (!this.currentUser) throw new Error('Brak aktywnej sesji Supabase.')
    assertCanEditAssessment(this.currentUser, assessment, 'Brak dostepu do edycji tej karty.')
    await this.saveAssessment(assessment)
  }

  async loadDrafts(): Promise<Record<AssessmentType, AssessmentDraft | undefined>> {
    if (!this.currentUser) return { r: undefined, m: undefined, s: undefined }
    const { data, error } = await this.client
      .from('user_drafts')
      .select('id,assessment_type,payload,saved_at,updated_at')
      .eq('user_id', this.currentUser.id)
    if (error) {
      if (isMissingTableError(error, 'user_drafts')) return { r: undefined, m: undefined, s: undefined }
      throw error
    }
    const drafts: Record<AssessmentType, AssessmentDraft | undefined> = { r: undefined, m: undefined, s: undefined }
    ;(data || []).forEach((row) => {
      const type = row.assessment_type as AssessmentType
      if (type === 'r' || type === 'm' || type === 's') {
        drafts[type] = {
          ...(row.payload as AssessmentDraft),
          type,
          savedAt: row.saved_at || row.updated_at || new Date().toISOString(),
        }
      }
    })
    return drafts
  }

  async saveDrafts(drafts: Record<AssessmentType, AssessmentDraft | undefined>): Promise<void> {
    if (!this.currentUser) throw new Error('Brak aktywnej sesji Supabase.')
    const userId = this.currentUser.id
    const operations = (['r', 'm', 's'] as AssessmentType[]).map((type) => {
      const draft = drafts[type]
      if (!draft) {
        return this.client
          .from('user_drafts')
          .delete()
          .eq('user_id', userId)
          .eq('assessment_type', type)
      }
      return this.client.from('user_drafts').upsert({
        user_id: userId,
        assessment_type: type,
        payload: draft,
        saved_at: draft.savedAt || new Date().toISOString(),
      }, { onConflict: 'user_id,assessment_type' })
    })
    const results = await Promise.all(operations)
    const failed = results.find((result) => result.error)
    if (failed?.error) throw failed.error
  }

  async loadNotifications(): Promise<Notification[]> {
    if (!this.currentUser) return []
    const { data, error } = await this.client
      .from('notifications')
      .select('id,user_id,type,title,message,read,related_entity_type,related_entity_id,created_at')
      .eq('user_id', this.currentUser.id)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) {
      if (isMissingTableError(error, 'notifications')) return []
      throw error
    }
    return (data || []).map((item) => ({
      id: item.id,
      userId: item.user_id,
      type: item.type as Notification['type'],
      title: item.title || '',
      message: item.message || '',
      read: Boolean(item.read),
      createdAt: item.created_at,
      relatedEntityType: item.related_entity_type as Notification['relatedEntityType'],
      relatedEntityId: item.related_entity_id || undefined,
    }))
  }

  async markNotificationRead(id: string): Promise<Notification[]> {
    if (!this.currentUser) return []
    const { error } = await this.client
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', this.currentUser.id)
    if (error) throw error
    return this.loadNotifications()
  }

  async markAllNotificationsRead(): Promise<Notification[]> {
    if (!this.currentUser) return []
    const { error } = await this.client
      .from('notifications')
      .update({ read: true })
      .eq('user_id', this.currentUser.id)
    if (error) throw error
    return this.loadNotifications()
  }

  async pushNotification(payload: Parameters<DataProvider['pushNotification']>[0]): Promise<Notification[]> {
    const userId = payload.userId || this.currentUser?.id
    if (!userId) return []
    const { error } = await this.client.from('notifications').insert({
      user_id: userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      read: false,
      related_entity_type: payload.relatedEntityType || null,
      related_entity_id: payload.relatedEntityId || null,
    })
    if (error) throw error
    return this.loadNotifications()
  }

  async loadAssessmentComments(assessmentId: string): Promise<AssessmentComment[]> {
    const { data, error } = await this.client
      .from('assessment_comments')
      .select('id,assessment_id,body,created_by,created_at,updated_at')
      .eq('assessment_id', assessmentId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data || []).map((item) => ({
      id: item.id,
      assessmentId: item.assessment_id,
      body: item.body,
      createdBy: item.created_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }))
  }

  async addAssessmentComment(assessmentId: string, body: string): Promise<AssessmentComment> {
    if (!this.currentUser) throw new Error('Brak aktywnej sesji Supabase.')
    if (!body.trim()) throw new Error('Komentarz nie może być pusty.')
    const { data, error } = await this.client
      .from('assessment_comments')
      .insert({
        assessment_id: assessmentId,
        body: body.trim(),
        created_by: this.currentUser.id,
      })
      .select('id,assessment_id,body,created_by,created_at,updated_at')
      .single()
    if (error) throw error
    return {
      id: data.id,
      assessmentId: data.assessment_id,
      body: data.body,
      createdBy: data.created_by,
      createdByName: this.currentUser.fullName || this.currentUser.email,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  }

  async loadUserPreference<T = unknown>(key: string): Promise<T | null> {
    if (!this.currentUser) return null
    const { data, error } = await this.client
      .from('user_preferences')
      .select('value')
      .eq('user_id', this.currentUser.id)
      .eq('key', key)
      .maybeSingle()
    if (error) throw error
    return (data?.value as T | undefined) ?? null
  }

  async saveUserPreference<T = unknown>(key: string, value: T): Promise<void> {
    if (!this.currentUser) throw new Error('Brak aktywnej sesji Supabase.')
    const { error } = await this.client.from('user_preferences').upsert({
      user_id: this.currentUser.id,
      key,
      value,
    }, { onConflict: 'user_id,key' })
    if (error) throw error
  }

  private async loadProfile(userId: string, email: string): Promise<UserProfile> {
    try {
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
    } catch (error) {
      console.warn('Supabase profile load failed:', getSafeErrorContext(error))
      throw error
    }
  }

  private async recordAdminHistory(description: string): Promise<void> {
    if (!this.currentUser?.id) return
    const { error } = await this.client.from('admin_history').insert({
      description,
      changed_by: this.currentUser.id,
    })
    if (error) console.warn('Admin history write failed:', getSafeErrorContext(error))
  }
}

let localProviderInstance: DemoDataProvider | null = null
let supabaseProviderInstance: SupabaseDataProvider | null = null

export function createProvider(forceLocal = false): DataProvider {
  const providerMode = getProviderMode()
  const configured = SupabaseDataProvider.isConfigured()
  if ((forceLocal || providerMode === 'local') && isLocalDemoEnabled()) {
    localProviderInstance ||= new DemoDataProvider()
    return localProviderInstance
  }
  if (configured && providerMode === 'supabase') {
    supabaseProviderInstance ||= new SupabaseDataProvider()
    return supabaseProviderInstance
  }
  if (isLocalDemoEnabled()) {
    localProviderInstance ||= new DemoDataProvider()
    return localProviderInstance
  }
  if (configured) {
    supabaseProviderInstance ||= new SupabaseDataProvider()
    return supabaseProviderInstance
  }
  return supabaseProviderInstance ||= new SupabaseDataProvider()
}
