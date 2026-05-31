import type { Notification, NotificationEntityType, NotificationType } from '../types/notification'

export type Role = 'admin' | 'director' | 'leader' | 'assessor' | 'viewer'

export type AssessmentType = 'r' | 'm' | 's'

export type ScoreValue = 1 | 0.5 | 0 | 'nd'

export type Rating = 'great' | 'good' | 'below' | ''

export type AssessmentStatus = 'submitted' | 'review' | 'approved' | 'archived'

export interface StatusEvent {
  status: AssessmentStatus
  at: string
  by: string
  note: string
}

export interface UserProfile {
  id: string
  email: string
  fullName: string
  role: Role
  leaderScope: string
  isActive: boolean
  source: 'supabase' | 'local'
}

export interface ManagedUser extends UserProfile {
  login?: string
  password?: string
  createdAt?: string
}

export interface Specialist {
  id: string
  name: string
  leader: string
  department: string
  position: string
  active: boolean
}

export interface AssessmentPeriod {
  code: string
  name: string
  from: string
  to: string
}

export interface Goal {
  callsPerPeriod: number
  mailsPerPeriod: number
  systemsPerPeriod: number
  minAvg: number
  greatShare: number
}

export interface AdminConfig {
  specialists: Specialist[]
  departments: string[]
  positions: string[]
  leaders: string[]
  periods: AssessmentPeriod[]
  goals: Goal
}

export interface AdminHistoryEntry {
  id?: string
  description: string
  changedBy: string
  changedAt: string
}

export interface UserDraftRecord {
  id: string
  userId: string
  assessmentType: AssessmentType
  payload: AssessmentDraft
  savedAt: string
  updatedAt: string
}

export interface AssessmentComment {
  id: string
  assessmentId: string
  body: string
  createdBy: string
  createdByName?: string
  createdAt: string
  updatedAt: string
}

export interface UserPreference {
  userId: string
  key: string
  value: unknown
  updatedAt: string
}

export interface CriterionDef {
  name: string
  hint: string
}

export interface SectionDef {
  key: string
  label: string
  weight: number
  criteria: CriterionDef[]
}

export interface AssessmentDef {
  name: string
  contactLabel: string
  pluralLabel: string
  sections: SectionDef[]
}

export type ScoresMatrix = Record<string, ScoreValue[][]>
export type NotesMatrix = Record<string, string[]>

export interface ContactResult {
  pct: number
  pts: { sum: number; max: number }
  parts: Record<string, number>
}

export interface AssessmentDraft {
  id?: string
  type: AssessmentType
  contactCount: number
  specialist: string
  position: string
  department: string
  assessor: string
  date: string
  period: string
  contactIds: string[]
  scores: ScoresMatrix
  notes: NotesMatrix
  gold: number[]
  goldDescription: string
  summary: string
  savedAt?: string
}

export interface Assessment {
  id: string
  type: AssessmentType
  spec: string
  stand: string
  dzial: string
  oce: string
  data: string
  period: string
  avgFinal: number
  secAvg: Record<string, number>
  contactResults: ContactResult[]
  rating: Rating
  notes: string
  contactCount: number
  ids: string[]
  snapshotScores: ScoresMatrix
  snapshotNotes: NotesMatrix
  gold: number[]
  goldDesc: string
  status: AssessmentStatus
  statusHistory: StatusEvent[]
  createdAt: string
  leaderScope: string
}

export interface AuthProvider {
  mode: 'supabase' | 'local'
  signIn(email: string, password: string): Promise<UserProfile>
  signInLocal?(login: string, password: string): Promise<UserProfile>
  signInWithGoogle?(): Promise<void>
  signOut(): Promise<void>
  getCurrentUser(): Promise<UserProfile | null>
}

export interface ConfigRepository {
  loadAdmin(): Promise<AdminConfig>
  saveAdmin(config: AdminConfig): Promise<void>
  loadAdminHistory?(): Promise<AdminHistoryEntry[]>
}

export interface UserRepository {
  listUsers?(): Promise<ManagedUser[]>
  createUser?(user: ManagedUser): Promise<ManagedUser>
  updateUser?(user: ManagedUser): Promise<ManagedUser>
}

export interface AssessmentRepository {
  loadAssessments(): Promise<Assessment[]>
  saveAssessment(assessment: Assessment): Promise<void>
  updateAssessment(assessment: Assessment): Promise<void>
  saveAssessments?(assessments: Assessment[]): Promise<void>
}

export interface DraftRepository {
  loadDrafts(): Promise<Record<AssessmentType, AssessmentDraft | undefined>>
  saveDrafts(drafts: Record<AssessmentType, AssessmentDraft | undefined>): Promise<void>
}

export interface NotificationRepository {
  loadNotifications(): Promise<Notification[]>
  markNotificationRead(id: string): Promise<Notification[]>
  markAllNotificationsRead(): Promise<Notification[]>
  pushNotification(payload: {
    type: NotificationType
    title: string
    message: string
    relatedEntityType?: NotificationEntityType
    relatedEntityId?: string
    userId?: string
  }): Promise<Notification[]>
}

export interface CommentRepository {
  loadAssessmentComments(assessmentId: string): Promise<AssessmentComment[]>
  addAssessmentComment(assessmentId: string, body: string): Promise<AssessmentComment>
}

export interface PreferenceRepository {
  loadUserPreference<T = unknown>(key: string): Promise<T | null>
  saveUserPreference<T = unknown>(key: string, value: T): Promise<void>
}

export interface DataProvider
  extends AuthProvider,
    ConfigRepository,
    UserRepository,
    AssessmentRepository,
    DraftRepository,
    NotificationRepository,
    CommentRepository,
    PreferenceRepository {}
