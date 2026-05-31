import { AlertTriangle, ChevronLeft, ChevronRight, MessageSquare, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ASSESSMENT_DEFS, TYPE_LABELS } from '../../domain/defs'
import { shortDateTime } from '../../domain/history'
import { ratingLabel } from '../../domain/scoring'
import type { Assessment, AssessmentComment } from '../../domain/types'
import { scoreClass } from '../../lib/display'
import { useLanguage } from '../../i18n/LanguageContext'
import { statusLabels } from '../registry/registryExports'
import {
  criterionAverage,
  formatAssessmentDate,
  scoreValueLabel,
  scoreValuePercent,
  sectionAverage,
  sortAssessmentsDesc,
} from './viewerMetrics'

function weakestCriterion(assessment: Assessment): { label: string; avg: number } | null {
  const def = ASSESSMENT_DEFS[assessment.type]
  let best: { label: string; avg: number } | null = null

  def.sections.forEach((section) => {
    section.criteria.forEach((criterion, criterionIndex) => {
      const avg = criterionAverage(assessment, section.key, criterionIndex)
      if (avg === null) return
      if (!best || avg < best.avg) {
        best = { label: `${section.label} • ${criterion.name}`, avg }
      }
    })
  })

  return best
}

export function ViewerAssessmentModal({
  assessment,
  quickAssessments,
  comments,
  commentsLoading,
  onClose,
  onSelectAssessment,
}: {
  assessment: Assessment
  quickAssessments: Assessment[]
  comments: AssessmentComment[]
  commentsLoading: boolean
  onClose: () => void
  onSelectAssessment: (assessmentId: string) => void
}) {
  const { t } = useLanguage()
  const [sectionFilter, setSectionFilter] = useState<'all' | string>('all')
  const def = ASSESSMENT_DEFS[assessment.type]
  const switcherAssessments = useMemo(() => {
    const seen = new Set<string>()
    return sortAssessmentsDesc([assessment, ...quickAssessments]).filter((item) => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
  }, [assessment, quickAssessments])
  const visibleSections = sectionFilter === 'all'
    ? def.sections
    : def.sections.filter((section) => section.key === sectionFilter)
  const weakest = useMemo(() => weakestCriterion(assessment), [assessment])
  const sectionSummary = def.sections.map((section) => ({
    section,
    avg: sectionAverage(assessment, section.key),
  }))

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="modal-card viewer-assessment-modal">
        <header className="modal-header">
          <div>
            <h3>{assessment.spec}</h3>
            <p>
              {TYPE_LABELS[assessment.type]} • {assessment.period} • {statusLabels[assessment.status]} • {formatAssessmentDate(assessment.data)}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('viewer.modal.close', 'Zamknij')}>
            <X size={18} />
          </button>
        </header>

        {switcherAssessments.length > 1 ? (
          <div className="viewer-modal-switcher">
            <div className="section-title">
              <span>{t('viewer.modal.pickRecent', 'Wybierz ocenę')}</span>
              <small>{switcherAssessments.length} {t('viewer.modal.switchCount', 'ostatnich ocen')}</small>
            </div>
            <div className="viewer-modal-switcher-row">
              <button
                type="button"
                className="viewer-modal-switch-arrow"
                onClick={() => {
                  const index = switcherAssessments.findIndex((item) => item.id === assessment.id)
                  const next = switcherAssessments[(index - 1 + switcherAssessments.length) % switcherAssessments.length]
                  onSelectAssessment(next.id)
                }}
                aria-label={t('viewer.modal.previous', 'Poprzednia ocena')}
              >
                <ChevronLeft size={16} />
              </button>
              {switcherAssessments.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`viewer-modal-switch-card${item.id === assessment.id ? ' active' : ''}`}
                  onClick={() => onSelectAssessment(item.id)}
                >
                  <span>{TYPE_LABELS[item.type]}</span>
                  <strong>{item.period}</strong>
                  <small>{item.avgFinal}% • {formatAssessmentDate(item.data)}</small>
                </button>
              ))}
              <button
                type="button"
                className="viewer-modal-switch-arrow"
                onClick={() => {
                  const index = switcherAssessments.findIndex((item) => item.id === assessment.id)
                  const next = switcherAssessments[(index + 1) % switcherAssessments.length]
                  onSelectAssessment(next.id)
                }}
                aria-label={t('viewer.modal.next', 'Następna ocena')}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ) : null}

        <div className="detail-kpi-grid">
          <div>
            <span>{t('viewer.modal.kpiScore', 'Wynik')}</span>
            <strong className={scoreClass(assessment.avgFinal)}>{assessment.avgFinal}%</strong>
          </div>
          <div>
            <span>{t('viewer.modal.kpiRating', 'Ocena')}</span>
            <strong>{ratingLabel(assessment.rating)}</strong>
          </div>
          <div>
            <span>{t('viewer.modal.kpiEvaluator', 'Oceniający')}</span>
            <strong>{assessment.oce || '-'}</strong>
          </div>
          <div>
            <span>{t('viewer.modal.kpiContacts', 'Kontakty')}</span>
            <strong>{assessment.contactCount}</strong>
          </div>
        </div>

        <div className="viewer-modal-body">
          <section className="viewer-modal-main">
            <section className="assessment-detail-panel">
              <div className="section-title">
                <span>{t('viewer.modal.sectionFilter', 'Filtr obszaru')}</span>
                <small>{t('viewer.modal.sectionFilterHint', 'Skup się na jednym aspekcie albo zobacz całość')}</small>
              </div>
              <div className="viewer-filter-chips">
                <button
                  type="button"
                  className={sectionFilter === 'all' ? 'active' : ''}
                  onClick={() => setSectionFilter('all')}
                >
                  {t('viewer.modal.allSections', 'Wszystkie')}
                </button>
                {def.sections.map((section) => (
                  <button
                    type="button"
                    key={section.key}
                    className={sectionFilter === section.key ? 'active' : ''}
                    onClick={() => setSectionFilter(section.key)}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            </section>

            {visibleSections.map((section) => {
              const avg = sectionAverage(assessment, section.key)
              return (
                <section className="assessment-detail-panel viewer-section-panel" key={section.key}>
                  <div className="viewer-section-header">
                    <div>
                      <span>{section.label}</span>
                      <small>{Math.round(section.weight * 100)}% {t('viewer.modal.weight', 'wagi')}</small>
                    </div>
                    <strong className={scoreClass(avg ?? 0)}>{avg === null ? '-' : `${avg}%`}</strong>
                  </div>

                  <div className="viewer-section-contact-summary">
                    {assessment.contactResults.map((result, index) => (
                      <div key={`${section.key}-${index}`} className="viewer-section-contact-card">
                        <span>{assessment.ids?.[index] || `${assessment.contactCount > 1 ? `${index + 1}.` : ''} ${def.contactLabel}`}</span>
                        <strong>{result.parts[section.key] ?? 100}%</strong>
                      </div>
                    ))}
                  </div>

                  <div className="viewer-criteria-list">
                    {section.criteria.map((criterion, criterionIndex) => {
                      const avgCriterion = criterionAverage(assessment, section.key, criterionIndex)
                      return (
                        <article className="viewer-criterion-row" key={criterion.name}>
                          <div className="viewer-criterion-copy">
                            <strong>{criterion.name}</strong>
                            <small>{criterion.hint}</small>
                          </div>
                          <div className="viewer-criterion-scores">
                            {assessment.snapshotScores[section.key]?.[criterionIndex]?.map((value, index) => (
                              <span key={`${criterion.name}-${index}`} title={scoreValuePercent(value)}>
                                {scoreValueLabel(value)}
                              </span>
                            ))}
                          </div>
                          <span className={scoreClass(avgCriterion ?? 0)}>{avgCriterion === null ? '-' : `${avgCriterion}%`}</span>
                        </article>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </section>

          <aside className="viewer-modal-side">
            <section className="viewer-modal-note">
              <div className="section-title">
                <span>{t('viewer.modal.feedback', 'Feedback')}</span>
                <small>{assessment.notes ? t('viewer.modal.hasNote', 'Zapisany komentarz') : t('viewer.modal.noNote', 'Brak podsumowania')}</small>
              </div>
              <p>{assessment.notes || t('detail.noSummary', 'Brak podsumowania końcowego.')}</p>
              {weakest ? (
                <div className="viewer-modal-priority">
                  <div className="viewer-modal-priority-icon">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <span>{t('viewer.modal.priorityLabel', 'Najpilniejszy do poprawy')}</span>
                    <strong>{weakest.label}</strong>
                    <small>{weakest.avg}%</small>
                  </div>
                </div>
              ) : null}
              <div className="viewer-modal-summary-list">
                {sectionSummary.map((item) => (
                  <div key={item.section.key}>
                    <span>{item.section.label}</span>
                    <strong className={scoreClass(item.avg ?? 0)}>{item.avg === null ? '-' : `${item.avg}%`}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="viewer-modal-note">
              <div className="section-title">
                <span>{t('viewer.modal.comments', 'Komentarze')}</span>
                <small>{commentsLoading ? t('detail.loadingComments', 'Ładowanie komentarzy...') : `${comments.length} ${t('viewer.modal.commentsCount', 'wpisów')}`}</small>
              </div>
              <div className="viewer-comments-list">
                {commentsLoading ? <div className="empty-state compact-empty">{t('detail.loadingComments', 'Ładowanie komentarzy...')}</div> : null}
                {!commentsLoading && comments.length ? comments.map((comment) => (
                  <article className="viewer-comment-card" key={comment.id}>
                    <div>
                      <strong>{comment.createdByName || comment.createdBy || t('detail.noCommentAuthor', 'Użytkownik')}</strong>
                      <small>{shortDateTime(comment.createdAt)}</small>
                    </div>
                    <p>{comment.body}</p>
                  </article>
                )) : null}
                {!commentsLoading && !comments.length ? (
                  <div className="empty-state compact-empty">
                    <MessageSquare size={22} />
                    <span>{t('detail.noComments', 'Brak komentarzy dla tej oceny.')}</span>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="viewer-modal-note">
              <div className="section-title">
                <span>{t('viewer.modal.meta', 'Metadane')}</span>
                <small>{assessment.id}</small>
              </div>
              <div className="viewer-modal-meta-grid">
                <div><span>{t('table.period', 'Okres')}</span><strong>{assessment.period}</strong></div>
                <div><span>{t('table.type', 'Typ')}</span><strong>{TYPE_LABELS[assessment.type]}</strong></div>
                <div><span>{t('table.status', 'Status')}</span><strong>{statusLabels[assessment.status]}</strong></div>
                <div><span>{t('detail.createdAt', 'Utworzono')}</span><strong>{formatAssessmentDate(assessment.createdAt)}</strong></div>
                <div><span>{t('detail.lastEntry', 'Ostatni wpis')}</span><strong>{shortDateTime(assessment.statusHistory?.[assessment.statusHistory.length - 1]?.at || assessment.createdAt)}</strong></div>
                <div><span>{t('detail.source', 'Źródło')}</span><strong>{assessment.leaderScope || '-'}</strong></div>
              </div>
            </section>
          </aside>
        </div>

        <footer className="modal-footer">
          <button className="primary-btn" type="button" onClick={onClose}>
            {t('viewer.modal.close', 'Zamknij')}
          </button>
        </footer>
      </section>
    </div>
  )
}
