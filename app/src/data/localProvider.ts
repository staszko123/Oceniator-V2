import { buildDemoAdmin, buildDemoAssessments } from './seed'
import { canAdminRole, isViewerRole } from '../domain/access'
import { describeAdminConfigSave, describeUserCreate, describeUserUpdate } from '../domain/audit'
import { scopeAssessmentsForUser, viewerAssessmentTokens } from '../domain/access'
import { calcContact, createDraft, emptyScores, periodOf, ratingForScore } from '../domain/scoring'
import type { AdminConfig, AdminHistoryEntry, Assessment, AssessmentComment, AssessmentDraft, AssessmentType, DataProvider, ManagedUser, Role, UserProfile } from '../domain/types'
import type { Notification } from '../types/notification'
import { assertCanAdmin, assertCanEditAssessment } from '../lib/security'
import { readStorageJson, removeStorageItem, writeStorageJson } from '../utils/storage'

const keys = {
  session: 'oc_v2_session',
  admin: 'oc_v2_admin',
  assessments: 'oc_v2_assessments',
  drafts: 'oc_v2_drafts',
  users: 'oc_v2_users',
  adminHistory: 'oc_v2_admin_history',
  comments: 'oc_v2_assessment_comments',
  notifications: 'oc_v2_notifications',
  preferences: 'oc_v2_user_preferences',
}

const defaultLocalUsers: Array<{ login: string; password: string; role: Role; fullName: string; leaderScope: string }> = [
  { login: 'admin', password: 'admin123', role: 'admin', fullName: 'Administrator systemu', leaderScope: '' },
  { login: 'dyrektor', password: 'dyrektor123', role: 'director', fullName: 'Dyrektor', leaderScope: '' },
  { login: 'lider', password: 'lider123', role: 'leader', fullName: 'Alicja Wrona', leaderScope: 'Alicja Wrona' },
  { login: 'lider01', password: 'lider123', role: 'leader', fullName: 'Alicja Wrona', leaderScope: 'Alicja Wrona' },
  { login: 'lider02', password: 'lider123', role: 'leader', fullName: 'Mateusz Cieslak', leaderScope: 'Mateusz Cieslak' },
  { login: 'oceniajacy', password: 'ocena123', role: 'assessor', fullName: 'Mateusz Cieslak', leaderScope: 'Mateusz Cieslak' },
  { login: 'podglad', password: 'podglad123', role: 'viewer', fullName: 'Anna Kowalska', leaderScope: 'Alicja Wrona' },
]

const viewerDemoAssessmentIds = [
  'viewer-demo-approved-1',
  'viewer-demo-approved-2',
  'viewer-demo-approved-3',
  'viewer-demo-approved-4',
  'viewer-demo-approved-5',
] as const

function isViewerDemoAssessment(item: Assessment): boolean {
  return viewerDemoAssessmentIds.includes(item.id as (typeof viewerDemoAssessmentIds)[number])
}

function appendAdminHistory(description: string): void {
  const history = readStorageJson<AdminHistoryEntry[]>(keys.adminHistory, [])
  const session = readStorageJson<UserProfile | null>(keys.session, null)
  history.unshift({
    id: crypto.randomUUID(),
    description,
    changedBy: session?.fullName || session?.email || 'local',
    changedAt: new Date().toISOString(),
  })
  writeStorageJson(keys.adminHistory, history.slice(0, 250))
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
  const existing = readStorageJson<ManagedUser[] | null>(keys.users, null)
  if (existing) {
    const merged = [
      ...existing,
      ...defaults.filter((user) => !existing.some((item) => item.login === user.login || item.email === user.email)),
    ]
    if (merged.length !== existing.length) writeStorageJson(keys.users, merged)
    return merged
  }
  const seeded = defaults
  writeStorageJson(keys.users, seeded)
  return seeded
}

function localProfile(user: ManagedUser): UserProfile {
  const isViewerDemo = user.login === 'podglad' || user.email === 'podglad@local'
  return {
    id: user.id,
    email: isViewerDemo ? 'podglad@local' : user.email,
    fullName: isViewerDemo ? 'Anna Kowalska' : user.fullName,
    role: isViewerDemo ? 'viewer' : user.role,
    leaderScope: isViewerDemo ? 'Alicja Wrona' : user.leaderScope,
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

function buildViewerDemoAssessments(): Assessment[] {
  const configs = [
    {
      id: 'viewer-demo-approved-1',
      type: 'r' as AssessmentType,
      date: '2026-01-16',
      leaderScope: 'Alicja Wrona',
      tweaks: [
        ['mery', 0, 0, 0.5], ['jak', 1, 1, 0], ['sys', 0, 2, 0.5],
      ],
      note: 'Utrzymac strukture rozmowy i dopracowac rozpoznanie potrzeb.',
    },
    {
      id: 'viewer-demo-approved-2',
      type: 'm' as AssessmentType,
      date: '2026-02-24',
      leaderScope: 'Alicja Wrona',
      tweaks: [
        ['mery', 2, 0, 0.5], ['mery', 3, 1, 0], ['jak', 0, 1, 0.5],
      ],
      note: 'Mocny wynik w mailach, do podniesienia precyzja finalnego domkniecia.',
    },
    {
      id: 'viewer-demo-approved-3',
      type: 's' as AssessmentType,
      date: '2026-03-19',
      leaderScope: 'Alicja Wrona',
      tweaks: [
        ['obs', 0, 0, 0.5], ['dok', 1, 1, 0.5],
      ],
      note: 'Stabilna obsluga systemowa, do poprawy dokumentacja zgloszen.',
    },
    {
      id: 'viewer-demo-approved-4',
      type: 'r' as AssessmentType,
      date: '2026-05-04',
      leaderScope: 'Alicja Wrona',
      tweaks: [
        ['mery', 4, 1, 0], ['jak', 3, 2, 0.5],
      ],
      note: 'Najmocniejszy rezultat z ostatniego okresu.',
    },
    {
      id: 'viewer-demo-approved-5',
      type: 'm' as AssessmentType,
      date: '2026-05-17',
      leaderScope: 'Alicja Wrona',
      tweaks: [
        ['mery', 1, 0, 0.5], ['jak', 2, 1, 0], ['jak', 4, 0, 0.5],
      ],
      note: 'Zatwierdzona karta demo dla widoku specjalisty.',
    },
  ] as const

  return configs.map((config, index) => {
    const contactCount = config.type === 'r' ? 3 : 2
    const scores = emptyScores(config.type, contactCount)
    config.tweaks.forEach(([sectionKey, criterionIndex, contactIndex, value]) => {
      scores[sectionKey][criterionIndex][contactIndex] = value
    })
    const contactResults = Array.from({ length: contactCount }, (_, contactIndex) => calcContact(config.type, scores, contactIndex))
    const avgFinal = Math.round(contactResults.reduce((acc, result) => acc + result.pct, 0) / contactResults.length)
    const secAvg = Object.fromEntries(
      Object.keys(scores).map((sectionKey) => {
        const values = contactResults.map((result) => result.parts[sectionKey] ?? 100)
        return [sectionKey, Math.round(values.reduce((acc, value) => acc + value, 0) / values.length)]
      }),
    )

    return {
      id: config.id,
      type: config.type,
      spec: 'Anna Kowalska',
      stand: 'Specjalista ds. Obslugi Klienta',
      dzial: 'Dzial Obslugi Klienta PeP',
      oce: 'Alicja Wrona',
      data: config.date,
      period: periodOf(config.date),
      avgFinal,
      secAvg,
      contactResults,
      rating: ratingForScore(avgFinal),
      notes: config.note,
      contactCount,
      ids: Array.from({ length: contactCount }, (_, itemIndex) => `${config.type.toUpperCase()}-${config.date.replaceAll('-', '')}-${index + 1}-${itemIndex + 1}`),
      snapshotScores: scores,
      snapshotNotes: Object.fromEntries(
        Object.keys(scores).map((sectionKey) => [sectionKey, Array.from({ length: contactCount }, () => '')]),
      ) as Assessment['snapshotNotes'],
      gold: Array.from({ length: contactCount }, () => 0),
      goldDesc: '',
      status: 'approved',
      statusHistory: [
        {
          status: 'approved',
          at: `${config.date}T09:00:00.000Z`,
          by: 'Alicja Wrona',
          note: 'Zatwierdzono karte demo specjalisty.',
        },
      ],
      createdAt: `${config.date}T09:00:00.000Z`,
      leaderScope: config.leaderScope,
    }
  })
}

function ensureViewerDemoAssessments(assessments: Assessment[], session: UserProfile | null): Assessment[] {
  const viewerTokens = session && isViewerRole(session.role) ? viewerAssessmentTokens(session) : []
  if (!viewerTokens.length) return assessments

  const viewerCards = assessments.filter((item) => item.status === 'approved' && viewerTokens.some((token) => item.spec === token || item.oce === token))
  if (viewerCards.length >= 5) return assessments

  const viewerDemoAssessments = buildViewerDemoAssessments()
  return [
    ...viewerDemoAssessments.filter((item) => !assessments.some((existing) => existing.id === item.id)),
    ...assessments,
  ]
}

export class DemoDataProvider implements DataProvider {
  mode = 'local' as const
  private currentUser: UserProfile | null = null

  async signIn(email: string, password: string): Promise<UserProfile> {
    return this.signInLocal(email, password)
  }

  async signInLocal(login: string, password: string): Promise<UserProfile> {
    const user = localUsers().find((item) => (item.login === login || item.email === login) && item.password === password && item.isActive)
    if (!user) throw new Error('Nieprawidlowy login lub haslo.')
    const profile = localProfile(user)
    writeStorageJson(keys.session, profile)
    this.currentUser = profile
    return profile
  }

  async signOut(): Promise<void> {
    removeStorageItem(keys.session)
    this.currentUser = null
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    const session = readStorageJson<UserProfile | null>(keys.session, null)
    if (!session || !isViewerRole(session.role)) return session
    const normalized = {
      ...session,
      email: session.email === 'podglad@local' ? 'podglad@local' : session.email,
      fullName: session.id === 'podglad' || session.email === 'podglad@local' ? 'Anna Kowalska' : session.fullName,
      leaderScope: session.id === 'podglad' || session.email === 'podglad@local' ? 'Alicja Wrona' : session.leaderScope,
    }
    if (normalized.fullName !== session.fullName || normalized.email !== session.email || normalized.leaderScope !== session.leaderScope) {
      writeStorageJson(keys.session, normalized)
    }
    this.currentUser = normalized
    return normalized
  }

  private readSessionUser(): UserProfile | null {
    return this.currentUser || readStorageJson<UserProfile | null>(keys.session, null)
  }

  private async loadAllAssessments(): Promise<Assessment[]> {
    const session = this.readSessionUser()
    const existing = readStorageJson<Assessment[] | null>(keys.assessments, null)
    if (existing) {
      const normalized = normalizeAssessments(existing)
      const cleaned = normalized.filter((item) => !isViewerDemoAssessment(item))
      if (cleaned.length !== normalized.length) writeStorageJson(keys.assessments, cleaned)
      const next = session && isViewerRole(session.role)
        ? ensureViewerDemoAssessments(cleaned, session)
        : cleaned
      return next
    }
    const assessments = buildDemoAssessments(await this.loadAdmin())
    writeStorageJson(keys.assessments, assessments)
    return session && isViewerRole(session.role)
      ? ensureViewerDemoAssessments(assessments, session)
      : assessments
  }

  async loadAdmin(): Promise<AdminConfig> {
    const existing = readStorageJson<AdminConfig | null>(keys.admin, null)
    if (existing) return existing
    const admin = buildDemoAdmin()
    writeStorageJson(keys.admin, admin)
    return admin
  }

  async saveAdmin(config: AdminConfig): Promise<void> {
    const session = this.readSessionUser()
    if (!session) throw new Error('Brak aktywnej sesji.')
    assertCanAdmin(session, 'Brak dostepu do zapisu konfiguracji administratora.')
    writeStorageJson(keys.admin, config)
    appendAdminHistory(describeAdminConfigSave(config))
  }

  async loadAdminHistory(): Promise<AdminHistoryEntry[]> {
    const session = this.readSessionUser()
    if (!session || !canAdminRole(session.role)) return []
    const history = readStorageJson<AdminHistoryEntry[]>(keys.adminHistory, [])
    return history.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
  }

  async listUsers(): Promise<ManagedUser[]> {
    const session = this.readSessionUser()
    if (!session) return []
    assertCanAdmin(session, 'Brak dostepu do listy uzytkownikow.')
    return localUsers()
  }

  async createUser(user: ManagedUser): Promise<ManagedUser> {
    const session = this.readSessionUser()
    if (!session) throw new Error('Brak aktywnej sesji.')
    assertCanAdmin(session, 'Brak dostepu do tworzenia uzytkownikow.')
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
    writeStorageJson(keys.users, [next, ...users])
    appendAdminHistory(describeUserCreate(next))
    return next
  }

  async updateUser(user: ManagedUser): Promise<ManagedUser> {
    const session = this.readSessionUser()
    if (!session) throw new Error('Brak aktywnej sesji.')
    assertCanAdmin(session, 'Brak dostepu do edycji uzytkownikow.')
    const users = localUsers()
    const next = users.map((item) => (item.id === user.id ? { ...item, ...user, source: 'local' as const } : item))
    writeStorageJson(keys.users, next)
    if (session.id === user.id) writeStorageJson(keys.session, localProfile({ ...user, source: 'local' }))
    appendAdminHistory(describeUserUpdate({ ...user, source: 'local' }))
    return { ...user, source: 'local' }
  }

  async loadAssessments(): Promise<Assessment[]> {
    const session = this.readSessionUser()
    const assessments = await this.loadAllAssessments()
    return session ? scopeAssessmentsForUser(assessments, session) : assessments
  }

  async saveAssessment(assessment: Assessment): Promise<void> {
    const session = this.readSessionUser()
    if (!session) throw new Error('Brak aktywnej sesji.')
    assertCanEditAssessment(session, assessment, 'Brak dostepu do zapisu tej karty.')
    const assessments = await this.loadAllAssessments()
    writeStorageJson(keys.assessments, [assessment, ...assessments.filter((item) => item.id !== assessment.id)])
  }

  async updateAssessment(assessment: Assessment): Promise<void> {
    const session = this.readSessionUser()
    if (!session) throw new Error('Brak aktywnej sesji.')
    assertCanEditAssessment(session, assessment, 'Brak dostepu do edycji tej karty.')
    const assessments = await this.loadAllAssessments()
    writeStorageJson(keys.assessments, assessments.map((item) => (item.id === assessment.id ? assessment : item)))
  }

  async saveAssessments(assessments: Assessment[]): Promise<void> {
    const session = this.readSessionUser()
    if (!session) throw new Error('Brak aktywnej sesji.')
    assessments.forEach((assessment) => assertCanEditAssessment(session, assessment, 'Brak dostepu do importu wybranych kart.'))
    writeStorageJson(keys.assessments, assessments)
  }

  async loadDrafts(): Promise<Record<AssessmentType, AssessmentDraft | undefined>> {
    const drafts = normalizeDrafts(readStorageJson<Record<AssessmentType, AssessmentDraft | undefined>>(keys.drafts, { r: undefined, m: undefined, s: undefined }))
    writeStorageJson(keys.drafts, drafts)
    return drafts
  }

  async saveDrafts(drafts: Record<AssessmentType, AssessmentDraft | undefined>): Promise<void> {
    writeStorageJson(keys.drafts, drafts)
  }

  async loadNotifications(): Promise<Notification[]> {
    const session = this.readSessionUser()
    const notifications = readStorageJson<Notification[]>(keys.notifications, [])
    return session
      ? notifications.filter((item) => !item.userId || item.userId === session.id)
      : notifications
  }

  async markNotificationRead(id: string): Promise<Notification[]> {
    const notifications = readStorageJson<Notification[]>(keys.notifications, [])
    writeStorageJson(keys.notifications, notifications.map((item) => (item.id === id ? { ...item, read: true } : item)))
    return this.loadNotifications()
  }

  async markAllNotificationsRead(): Promise<Notification[]> {
    const session = this.readSessionUser()
    const notifications = readStorageJson<Notification[]>(keys.notifications, [])
    writeStorageJson(keys.notifications, notifications.map((item) => (
      !session || !item.userId || item.userId === session.id ? { ...item, read: true } : item
    )))
    return this.loadNotifications()
  }

  async pushNotification(payload: Parameters<DataProvider['pushNotification']>[0]): Promise<Notification[]> {
    const session = this.readSessionUser()
    const notification: Notification = {
      id: crypto.randomUUID(),
      userId: payload.userId || session?.id,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      read: false,
      createdAt: new Date().toISOString(),
      relatedEntityType: payload.relatedEntityType,
      relatedEntityId: payload.relatedEntityId,
    }
    const notifications = readStorageJson<Notification[]>(keys.notifications, [])
    writeStorageJson(keys.notifications, [notification, ...notifications].slice(0, 100))
    return this.loadNotifications()
  }

  async loadAssessmentComments(assessmentId: string): Promise<AssessmentComment[]> {
    const comments = readStorageJson<Record<string, AssessmentComment[]>>(keys.comments, {})
    return [...(comments[assessmentId] || [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  async addAssessmentComment(assessmentId: string, body: string): Promise<AssessmentComment> {
    const session = this.readSessionUser()
    if (!session) throw new Error('Brak aktywnej sesji.')
    if (isViewerRole(session.role)) throw new Error('Brak dostępu do komentowania tej oceny.')
    if (!body.trim()) throw new Error('Komentarz nie może być pusty.')
    const comment: AssessmentComment = {
      id: crypto.randomUUID(),
      assessmentId,
      body: body.trim(),
      createdBy: session.id,
      createdByName: session.fullName || session.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const comments = readStorageJson<Record<string, AssessmentComment[]>>(keys.comments, {})
    writeStorageJson(keys.comments, {
      ...comments,
      [assessmentId]: [...(comments[assessmentId] || []), comment],
    })
    return comment
  }

  async loadUserPreference<T = unknown>(key: string): Promise<T | null> {
    const session = this.readSessionUser()
    const preferences = readStorageJson<Record<string, Record<string, unknown>>>(keys.preferences, {})
    if (!session) return null
    return (preferences[session.id]?.[key] as T | undefined) ?? null
  }

  async saveUserPreference<T = unknown>(key: string, value: T): Promise<void> {
    const session = this.readSessionUser()
    if (!session) throw new Error('Brak aktywnej sesji.')
    const preferences = readStorageJson<Record<string, Record<string, unknown>>>(keys.preferences, {})
    writeStorageJson(keys.preferences, {
      ...preferences,
      [session.id]: {
        ...(preferences[session.id] || {}),
        [key]: value,
      },
    })
  }
}
