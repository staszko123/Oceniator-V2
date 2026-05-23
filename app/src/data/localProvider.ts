import { buildDemoAdmin, buildDemoAssessments } from './seed'
import { createDraft } from '../domain/scoring'
import type { AdminConfig, Assessment, AssessmentDraft, AssessmentType, DataProvider, ManagedUser, Role, UserProfile } from '../domain/types'

const keys = {
  session: 'oc_v2_session',
  admin: 'oc_v2_admin',
  assessments: 'oc_v2_assessments',
  drafts: 'oc_v2_drafts',
  users: 'oc_v2_users',
}

const defaultLocalUsers: Array<{ login: string; password: string; role: Role; fullName: string; leaderScope: string }> = [
  { login: 'admin', password: 'admin123', role: 'admin', fullName: 'Administrator systemu', leaderScope: '' },
  { login: 'dyrektor', password: 'dyrektor123', role: 'director', fullName: 'Dyrektor', leaderScope: '' },
  { login: 'lider', password: 'lider123', role: 'leader', fullName: 'Alicja Wrona', leaderScope: 'Alicja Wrona' },
  { login: 'lider01', password: 'lider123', role: 'leader', fullName: 'Alicja Wrona', leaderScope: 'Alicja Wrona' },
  { login: 'lider02', password: 'lider123', role: 'leader', fullName: 'Mateusz Cieslak', leaderScope: 'Mateusz Cieslak' },
  { login: 'oceniajacy', password: 'ocena123', role: 'assessor', fullName: 'Mateusz Cieslak', leaderScope: 'Mateusz Cieslak' },
  { login: 'podglad', password: 'podglad123', role: 'viewer', fullName: 'Uzytkownik podgladu', leaderScope: 'Alicja Wrona' },
]

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

function defaultManagedUsers(): ManagedUser[] {
  return defaultLocalUsers.map((user) => ({
    id: user.login,
    login: user.login,
    email: `${user.login}@local`,
    fullName: user.fullName,
    role: user.role,
    leaderScope: user.leaderScope,
    isActive: true,
    source: 'local' as const,
    password: user.password,
    createdAt: new Date().toISOString(),
  }))
}

function localUsers(): ManagedUser[] {
  const defaults = defaultManagedUsers()
  const existing = readJson<ManagedUser[] | null>(keys.users, null)
  if (existing) {
    const merged = [
      ...existing,
      ...defaults.filter((user) => !existing.some((item) => item.login === user.login || item.email === user.email)),
    ]
    if (merged.length !== existing.length) writeJson(keys.users, merged)
    return merged
  }
  const seeded = defaults
  writeJson(keys.users, seeded)
  return seeded
}

function localProfile(user: ManagedUser): UserProfile {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    leaderScope: user.leaderScope,
    isActive: user.isActive,
    source: 'local',
  }
}

function normalizeDrafts(value: Record<AssessmentType, AssessmentDraft | undefined>): Record<AssessmentType, AssessmentDraft | undefined> {
  const next: Record<AssessmentType, AssessmentDraft | undefined> = { r: undefined, m: undefined, s: undefined }
  ;(['r', 'm', 's'] as AssessmentType[]).forEach((type) => {
    const draft = value[type]
    if (!draft || draft.type !== type || !draft.scores || !draft.notes || !Array.isArray(draft.contactIds)) return
    const fallback = createDraft(type)
    next[type] = {
      ...fallback,
      ...draft,
      contactCount: Math.max(1, Math.min(6, Number(draft.contactCount) || fallback.contactCount)),
      contactIds: Array.isArray(draft.contactIds) ? draft.contactIds.map(String) : fallback.contactIds,
      gold: Array.isArray(draft.gold) ? draft.gold.map(Number) : fallback.gold,
    }
  })
  return next
}

function normalizeAssessments(value: Assessment[]): Assessment[] {
  return value.filter((item) => (
    item
    && typeof item.id === 'string'
    && ['r', 'm', 's'].includes(item.type)
    && typeof item.spec === 'string'
    && typeof item.avgFinal === 'number'
    && item.snapshotScores
    && item.snapshotNotes
  )).map((item) => {
    const fallbackAt = item.createdAt || `${item.data || new Date().toISOString().slice(0, 10)}T09:00:00.000Z`
    const fallbackHistory = Array.isArray(item.statusHistory) && item.statusHistory.length
      ? item.statusHistory
      : [{
          status: item.status || 'submitted',
          at: fallbackAt,
          by: item.oce || 'system',
          note: 'Utworzono kart\u0119 bazow\u0105',
        }]

    return {
      ...item,
      status: item.status || 'submitted',
      statusHistory: fallbackHistory,
      ids: Array.isArray(item.ids) ? item.ids : [],
      gold: Array.isArray(item.gold) ? item.gold : [],
      contactCount: Math.max(1, Math.min(6, Number(item.contactCount) || 1)),
      leaderScope: item.leaderScope || item.oce || '',
    }
  })
}

export class LocalDataProvider implements DataProvider {
  mode = 'local' as const

  async signIn(email: string, password: string): Promise<UserProfile> {
    return this.signInLocal(email, password)
  }

  async signInLocal(login: string, password: string): Promise<UserProfile> {
    const user = localUsers().find((item) => (item.login === login || item.email === login) && item.password === password && item.isActive)
    if (!user) throw new Error('Nieprawidlowy login lub haslo.')
    const profile = localProfile(user)
    writeJson(keys.session, profile)
    return profile
  }

  async signOut(): Promise<void> {
    localStorage.removeItem(keys.session)
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    return readJson<UserProfile | null>(keys.session, null)
  }

  async loadAdmin(): Promise<AdminConfig> {
    const existing = readJson<AdminConfig | null>(keys.admin, null)
    if (existing) return existing
    const admin = buildDemoAdmin()
    writeJson(keys.admin, admin)
    return admin
  }

  async saveAdmin(config: AdminConfig): Promise<void> {
    writeJson(keys.admin, config)
  }

  async listUsers(): Promise<ManagedUser[]> {
    return localUsers()
  }

  async createUser(user: ManagedUser): Promise<ManagedUser> {
    const users = localUsers()
    const login = user.login?.trim() || user.email.split('@')[0]
    if (users.some((item) => item.login === login || item.email === user.email)) {
      throw new Error('Uzytkownik o takim loginie lub emailu juz istnieje.')
    }
    const next: ManagedUser = {
      ...user,
      id: login,
      login,
      email: user.email || `${login}@local`,
      password: user.password || 'start123',
      isActive: user.isActive !== false,
      source: 'local',
      createdAt: new Date().toISOString(),
    }
    writeJson(keys.users, [next, ...users])
    return next
  }

  async updateUser(user: ManagedUser): Promise<ManagedUser> {
    const users = localUsers()
    const next = users.map((item) => (item.id === user.id ? { ...item, ...user, source: 'local' as const } : item))
    writeJson(keys.users, next)
    const session = readJson<UserProfile | null>(keys.session, null)
    if (session?.id === user.id) writeJson(keys.session, localProfile({ ...user, source: 'local' }))
    return { ...user, source: 'local' }
  }

  async loadAssessments(): Promise<Assessment[]> {
    const existing = readJson<Assessment[] | null>(keys.assessments, null)
    if (existing) {
      const normalized = normalizeAssessments(existing)
      if (normalized.length !== existing.length) writeJson(keys.assessments, normalized)
      return normalized
    }
    const assessments = buildDemoAssessments(await this.loadAdmin())
    writeJson(keys.assessments, assessments)
    return assessments
  }

  async saveAssessment(assessment: Assessment): Promise<void> {
    const assessments = await this.loadAssessments()
    writeJson(keys.assessments, [assessment, ...assessments.filter((item) => item.id !== assessment.id)])
  }

  async updateAssessment(assessment: Assessment): Promise<void> {
    const assessments = await this.loadAssessments()
    writeJson(keys.assessments, assessments.map((item) => (item.id === assessment.id ? assessment : item)))
  }

  async saveAssessments(assessments: Assessment[]): Promise<void> {
    writeJson(keys.assessments, assessments)
  }

  async loadDrafts(): Promise<Record<AssessmentType, AssessmentDraft | undefined>> {
    const drafts = normalizeDrafts(readJson<Record<AssessmentType, AssessmentDraft | undefined>>(keys.drafts, { r: undefined, m: undefined, s: undefined }))
    writeJson(keys.drafts, drafts)
    return drafts
  }

  async saveDrafts(drafts: Record<AssessmentType, AssessmentDraft | undefined>): Promise<void> {
    writeJson(keys.drafts, drafts)
  }
}
