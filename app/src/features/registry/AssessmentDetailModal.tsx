import { useState } from 'react'
import { FileText, MessageSquarePlus, Pencil, ShieldCheck, X } from 'lucide-react'
import type { Assessment, AssessmentComment, UserProfile } from '../../domain/types'
import { assessmentStatusConfig } from '../../config/status'
import { lastHistoryAt, lastHistoryBy, lastHistoryNote, lastStatusEvent, shortDateTime } from '../../domain/history'
import { scoreClass } from '../../lib/display'
import { useLanguage } from '../../i18n/LanguageContext'

export function AssessmentDetailModal({
  assessment,
  user,
  onClose,
  onPrint,
  onEdit,
  onAdvance,
  comments = [],
  commentsLoading = false,
  onAddComment,
}: {
  assessment: Assessment
  user: UserProfile
  onClose: () => void
  onPrint?: (assessment: Assessment) => void
  onEdit?: (assessment: Assessment) => void
  onAdvance?: (assessment: Assessment) => void
  comments?: AssessmentComment[]
  commentsLoading?: boolean
  onAddComment?: (body: string) => Promise<void>
}) {
  const { t } = useLanguage()
  const [commentBody, setCommentBody] = useState('')
  const [commentError, setCommentError] = useState('')
  const [commentBusy, setCommentBusy] = useState(false)
  const status = assessmentStatusConfig[assessment.status]
  const lastEvent = lastStatusEvent(assessment)
  const history = assessment.statusHistory || []

  async function submitComment() {
    if (!onAddComment) return
    if (!commentBody.trim()) {
      setCommentError(t('detail.commentEmpty', 'Komentarz nie może być pusty.'))
      return
    }
    setCommentBusy(true)
    setCommentError('')
    try {
      await onAddComment(commentBody)
      setCommentBody('')
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : t('detail.commentSaveError', 'Nie udało się zapisać komentarza.'))
    } finally {
      setCommentBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="modal-card preview-modal assessment-detail-modal">
        <header className="modal-header">
          <div>
            <h3>{assessment.spec}</h3>
            <p>{assessment.period} • {assessment.type.toUpperCase()} • {status.label}</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </header>

        <div className="detail-kpi-grid">
          <div>
            <span>{t('table.score')}</span>
            <strong className={scoreClass(assessment.avgFinal)}>{assessment.avgFinal}%</strong>
          </div>
          <div>
            <span>{t('table.status')}</span>
            <strong>{status.label}</strong>
          </div>
          <div>
            <span>{t('table.evaluator')}</span>
            <strong>{assessment.oce || '-'}</strong>
          </div>
          <div>
            <span>{t('label.leader', 'Lider')}</span>
            <strong>{assessment.leaderScope || '-'}</strong>
          </div>
        </div>

        <section className="assessment-detail-panel">
          <div className="section-title">
            <span>{t('detail.basicData')}</span>
            <small>{assessment.data}</small>
          </div>
          <div className="assessment-detail-grid">
            <div><span>{t('table.specialist')}</span><strong>{assessment.spec}</strong></div>
            <div><span>{t('label.position', 'Stanowisko')}</span><strong>{assessment.stand || '-'}</strong></div>
            <div><span>{t('label.department', 'Dział')}</span><strong>{assessment.dzial || '-'}</strong></div>
            <div><span>{t('detail.finalScore')}</span><strong className={scoreClass(assessment.avgFinal)}>{assessment.avgFinal}%</strong></div>
            <div><span>{t('detail.createdAt')}</span><strong>{shortDateTime(assessment.createdAt)}</strong></div>
            <div><span>{t('detail.lastChangeLabel')}</span><strong>{lastHistoryAt(assessment) ? shortDateTime(lastHistoryAt(assessment)) : '-'}</strong></div>
          </div>
        </section>

        <section className="assessment-detail-panel">
          <div className="section-title">
            <span>{t('detail.descriptionHistory')}</span>
            <small>{history.length} wpisów</small>
          </div>
          <div className="assessment-detail-notes">
            <article>
              <span>{t('detail.summary')}</span>
              <p>{assessment.notes || t('detail.noSummary')}</p>
            </article>
            <article>
              <span>{t('detail.lastChangeLabel')}</span>
              <p>{lastHistoryNote(assessment) || t('detail.noTimeline')}</p>
              <small>{lastHistoryBy(assessment) || t('detail.noTimelineAuthor')}</small>
            </article>
          </div>
        </section>

        <section className="assessment-detail-panel">
          <div className="section-title">
            <span>{t('detail.statusHistory')}</span>
            <small>{history.length}</small>
          </div>
          <div className="assessment-detail-timeline">
            {history.length ? history.map((item, index) => (
              <div className="assessment-detail-timeline-item" key={`${item.status}-${item.at}-${index}`}>
                <strong>{assessmentStatusConfig[item.status].label}</strong>
                <span>{shortDateTime(item.at)} • {item.by || t('detail.noTimelineAuthor')}</span>
                <small>{item.note}</small>
              </div>
            )) : <div className="empty-state compact-empty">{t('detail.noHistory')}</div>}
          </div>
        </section>

        <section className="assessment-detail-panel">
          <div className="section-title">
            <span>{t('detail.comments')}</span>
            <small>{commentsLoading ? t('detail.loadingComments') : `${comments.length} wpisów`}</small>
          </div>
          <div className="assessment-comments-list">
            {commentsLoading ? <div className="empty-state compact-empty">{t('detail.loadingComments')}</div> : null}
            {!commentsLoading && comments.length ? comments.map((comment) => (
              <article className="assessment-comment" key={comment.id}>
                <strong>{comment.createdByName || comment.createdBy || t('detail.noCommentAuthor')}</strong>
                <p>{comment.body}</p>
                <small>{shortDateTime(comment.createdAt)}</small>
              </article>
            )) : null}
            {!commentsLoading && !comments.length ? <div className="empty-state compact-empty">{t('detail.noComments')}</div> : null}
          </div>
          {onAddComment ? (
            <div className="assessment-comment-form">
              <textarea
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                placeholder={t('detail.commentPlaceholder')}
              />
              {commentError ? <div className="error-box compact-error">{commentError}</div> : null}
              <button className="ghost-btn" type="button" disabled={commentBusy} onClick={() => void submitComment()}>
                <MessageSquarePlus size={16} /> {t('detail.addComment')}
              </button>
            </div>
          ) : null}
        </section>

        <section className="assessment-detail-panel">
          <div className="section-title">
            <span>{t('detail.metadata')}</span>
            <small>{shortDateTime(assessment.createdAt)}</small>
          </div>
          <div className="assessment-detail-grid">
            <div><span>{t('detail.assessmentId')}</span><strong>{assessment.id}</strong></div>
            <div><span>{t('detail.contacts')}</span><strong>{assessment.contactCount}</strong></div>
            <div><span>{t('detail.source')}</span><strong>{user.role}</strong></div>
            <div><span>{t('detail.lastEntry')}</span><strong>{lastEvent ? shortDateTime(lastEvent.at) : '-'}</strong></div>
          </div>
        </section>

        <footer className="modal-footer">
          {onPrint ? (
            <button className="ghost-btn" type="button" onClick={() => onPrint(assessment)}>
              <FileText size={16} /> {t('detail.printPdf')}
            </button>
          ) : null}
          {onEdit ? (
            <button className="ghost-btn" type="button" onClick={() => onEdit(assessment)}>
              <Pencil size={16} /> {t('detail.edit')}
            </button>
          ) : null}
          {onAdvance ? (
            <button className="ghost-btn" type="button" onClick={() => onAdvance(assessment)}>
              <ShieldCheck size={16} /> {t('detail.changeStatus')}
            </button>
          ) : null}
          <button className="primary-btn" type="button" onClick={onClose}>{t('detail.close')}</button>
        </footer>
      </section>
    </div>
  )
}
