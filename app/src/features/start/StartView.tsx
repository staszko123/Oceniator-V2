import { ClipboardCheck, FileText, Plus, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react'
import { TYPE_LABELS } from '../../domain/defs'
import { canCreateRole } from '../../domain/access'
import { draftHasContent } from '../../domain/scoring'
import type { Assessment, AssessmentDraft, AssessmentType, UserProfile } from '../../domain/types'
import { AssessmentTable } from '../registry/AssessmentTable'
import { useLanguage } from '../../i18n/LanguageContext'

type ViewKey = 'start' | 'form' | 'team' | 'registry' | 'dashboard' | 'reports' | 'admin'

function roleLabel(role: UserProfile['role'], t: (key: string, fallback?: string) => string): string {
  if (role === 'admin') return t('role.admin', 'Administrator')
  if (role === 'director') return t('role.director', 'Dyrektor')
  if (role === 'leader') return t('role.leader', 'Lider')
  if (role === 'assessor') return t('role.assessor', 'Oceniający')
  return t('role.viewer', 'Specjalista')
}

export default function StartView({
  user,
  assessments,
  drafts,
  setView,
  openRegistry,
  onResumeDraft,
  onClearDraft,
}: {
  user: UserProfile
  assessments: Assessment[]
  drafts: Record<AssessmentType, AssessmentDraft | undefined>
  setView: (view: ViewKey) => void
  openRegistry: (preset?: 'all' | 'decision' | 'recent' | 'edited') => void
  onResumeDraft: (type: AssessmentType) => void
  onClearDraft: (type: AssessmentType) => void
}) {
  const { t } = useLanguage()
  const active = assessments.filter((item) => item.status !== 'archived')
  const review = active.filter((item) => item.status === 'review').length
  const submitted = active.filter((item) => item.status === 'submitted').length
  const lowScores = active.filter((item) => item.avgFinal < 82).length
  const decisionCount = review + submitted
  const savedDrafts = (Object.entries(drafts) as Array<[AssessmentType, AssessmentDraft | undefined]>)
    .filter((entry): entry is [AssessmentType, AssessmentDraft] => Boolean(entry[1] && draftHasContent(entry[1])))
    .sort(([, left], [, right]) => (right.savedAt || '').localeCompare(left.savedAt || ''))
  const recentCards = [...active]
    .sort((left, right) => (
      right.data.localeCompare(left.data)
      || right.createdAt.localeCompare(left.createdAt)
      || right.avgFinal - left.avgFinal
    ))
    .slice(0, 8)
  const nextActions = [
    {
      label: t('start.toDecision'),
      value: decisionCount,
      hint: t('start.decisionHint'),
      action: () => openRegistry('decision'),
    },
    {
      label: t('start.belowStandard'),
      value: lowScores,
      hint: t('start.quickCheck'),
      action: () => setView('dashboard'),
    },
  ].filter((item) => item.value > 0) as Array<{ label: string; value: number; hint: string; action: () => void }>

  return (
    <main className="screen start-screen">
      <section className="start-hero-grid">
        <div className="hero-panel">
          <div className="section-title">
            <span>{t('start.title')}</span>
            <small>{new Date().toLocaleDateString('pl-PL')}</small>
          </div>
          <h1>{t('start.hero')}</h1>
          <div className="quick-actions">
            {canCreateRole(user.role) ? <button className="primary-btn" onClick={() => setView('form')} type="button"><Plus size={16} /> {t('start.newEvaluation')}</button> : null}
            <button className="ghost-btn" onClick={() => openRegistry('all')} type="button"><ClipboardCheck size={16} /> {t('start.registry')}</button>
          </div>
          <div className="hero-inline-note">
            <span>{t('start.role')}: {roleLabel(user.role, t)}</span>
            <strong>{user.fullName}</strong>
            <small className="hero-inline-meta">{decisionCount ? `${decisionCount} ${t('start.pendingReview', 'kart czeka na decyzję lub review')}` : t('start.noPending')}</small>
          </div>
        </div>
        <div className="metric-panel"><span>{t('start.cardsToWork')}</span><strong>{active.length}</strong><small>{t('start.currentFlow')}</small></div>
        <div className="metric-panel"><span>{t('start.toDecision')}</span><strong>{decisionCount}</strong><small>{t('start.pendingReviewHint')}</small></div>
        <div className="metric-panel"><span>{t('start.belowStandard')}</span><strong>{lowScores}</strong><small>{t('start.quickCheck')}</small></div>
      </section>

      <section className="start-center-grid">
        <div className="data-panel">
          <div className="section-title"><span>{t('start.priority')}</span><small>{t('start.prioritySubtitle')}</small></div>
          {nextActions.length ? (
            <div className="action-priority-list">
              {nextActions.map((item) => (
                <button className="action-priority-card" key={item.label} type="button" onClick={item.action}>
                  <div>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                  <small>{item.hint}</small>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state compact-empty">{t('start.noTasks')}</div>
          )}
        </div>

        <div className="data-panel">
          <div className="section-title"><span>{t('start.shortcuts')}</span><small>{t('start.shortcutsSubtitle')}</small></div>
          <div className="quick-paths">
            <button className="quick-path" type="button" onClick={() => setView('form')}>
              <Plus size={16} />
              <span>
                <strong>{t('start.newEvaluation')}</strong>
                <small>{t('start.newEvaluationHint')}</small>
              </span>
            </button>
            <button className="quick-path" type="button" onClick={() => openRegistry('all')}>
              <ClipboardCheck size={16} />
              <span>
                <strong>{t('start.registry')}</strong>
                <small>{t('start.registryHint')}</small>
              </span>
            </button>
            <button className="quick-path" type="button" onClick={() => setView('dashboard')}>
              <ShieldCheck size={16} />
              <span>
                <strong>{t('start.analytics')}</strong>
                <small>{t('start.analyticsHint')}</small>
              </span>
            </button>
            <button className="quick-path" type="button" onClick={() => setView('reports')}>
              <FileText size={16} />
              <span>
                <strong>{t('start.reports')}</strong>
                <small>{t('start.reportsHint')}</small>
              </span>
            </button>
          </div>
        </div>
      </section>

      <details className="start-details data-panel">
        <summary>
          <span>{t('start.details')}</span>
          <small>{savedDrafts.length ? `${savedDrafts.length} ${t('start.draftsActive')}` : t('start.detailsHint')}</small>
        </summary>
        <div className="start-details-grid">
          <div className="detail-metric"><span>{t('start.avgScore')}</span><strong>{active.length ? Math.round(active.reduce((acc, item) => acc + item.avgFinal, 0) / active.length) : '-'}%</strong></div>
          <div className="detail-metric"><span>{t('start.toDecision')}</span><strong>{decisionCount}</strong></div>
          <div className="detail-metric"><span>{t('start.belowStandard')}</span><strong>{lowScores}</strong></div>
          <div className="detail-metric"><span>{t('role.label', 'Rola')}</span><strong>{roleLabel(user.role, t)}</strong></div>
        </div>

        <div className="section-title nested">
          <span>{t('start.drafts')}</span>
          <small>{savedDrafts.length ? `${savedDrafts.length} ${t('start.draftsActive')}` : t('start.noDrafts')}</small>
        </div>
        {savedDrafts.length ? (
          <div className="draft-grid">
            {savedDrafts.map(([type, draft]) => (
              <article className="draft-card" key={type}>
                <div className="draft-card-top">
                  <span className="type-badge">{TYPE_LABELS[type]}</span>
                  <small>{draft.savedAt ? new Date(draft.savedAt).toLocaleString('pl-PL') : t('start.noSaveDate')}</small>
                </div>
                <strong>{draft.specialist || t('start.draftWithoutSpecialist')}</strong>
                <p>{draft.summary || `${draft.contactCount} kontakt(y), okres ${draft.period || '-'}`}</p>
                <div className="draft-card-meta">
                  <span>{draft.position || t('start.noPosition')}</span>
                  <span>{draft.department || t('start.noDepartment')}</span>
                </div>
                <div className="draft-card-actions">
                  <button className="primary-btn" type="button" onClick={() => onResumeDraft(type)}>
                    <RotateCcw size={15} /> {t('start.resumeDraft')}
                  </button>
                  <button className="ghost-btn" type="button" onClick={() => onClearDraft(type)}>
                    <Trash2 size={15} /> {t('start.clearDraft')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="empty-state">{t('start.noDraftsText')}</div>}

        <div className="section-title nested">
          <span>{t('start.lastCards')}</span>
          <small>{recentCards.length ? t('start.top', 'Top {count}').replace('{count}', String(recentCards.length)) : t('start.noData')}</small>
        </div>
        <AssessmentTable assessments={recentCards} compact />
      </details>
    </main>
  )
}
