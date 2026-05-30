import { FileText, Pencil, ShieldCheck, X } from 'lucide-react'
import type { Assessment, UserProfile } from '../../domain/types'
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
}: {
  assessment: Assessment
  user: UserProfile
  onClose: () => void
  onPrint?: (assessment: Assessment) => void
  onEdit?: (assessment: Assessment) => void
  onAdvance?: (assessment: Assessment) => void
}) {
  const { t } = useLanguage()
  const status = assessmentStatusConfig[assessment.status]
  const lastEvent = lastStatusEvent(assessment)
  const history = assessment.statusHistory || []

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
            <span>Oceniający</span>
            <strong>{assessment.oce || '-'}</strong>
          </div>
          <div>
            <span>Lider</span>
            <strong>{assessment.leaderScope || '-'}</strong>
          </div>
        </div>

        <section className="assessment-detail-panel">
          <div className="section-title">
            <span>Dane podstawowe</span>
            <small>{assessment.data}</small>
          </div>
          <div className="assessment-detail-grid">
            <div><span>Specjalista</span><strong>{assessment.spec}</strong></div>
            <div><span>Stanowisko</span><strong>{assessment.stand || '-'}</strong></div>
            <div><span>Dział</span><strong>{assessment.dzial || '-'}</strong></div>
            <div><span>Wynik końcowy</span><strong className={scoreClass(assessment.avgFinal)}>{assessment.avgFinal}%</strong></div>
            <div><span>Utworzono</span><strong>{shortDateTime(assessment.createdAt)}</strong></div>
            <div><span>Ostatnia zmiana</span><strong>{lastHistoryAt(assessment) ? shortDateTime(lastHistoryAt(assessment)) : '-'}</strong></div>
          </div>
        </section>

        <section className="assessment-detail-panel">
          <div className="section-title">
            <span>Opis i historia</span>
            <small>{history.length} wpisów</small>
          </div>
          <div className="assessment-detail-notes">
            <article>
              <span>Podsumowanie</span>
              <p>{assessment.notes || 'Brak podsumowania końcowego.'}</p>
            </article>
            <article>
              <span>Ostatnia zmiana</span>
              <p>{lastHistoryNote(assessment) || 'Brak zapisanej historii zmian.'}</p>
              <small>{lastHistoryBy(assessment) || 'system'}</small>
            </article>
          </div>
        </section>

        <section className="assessment-detail-panel">
          <div className="section-title">
            <span>Historia statusów</span>
            <small>{history.length}</small>
          </div>
          <div className="assessment-detail-timeline">
            {history.length ? history.map((item, index) => (
              <div className="assessment-detail-timeline-item" key={`${item.status}-${item.at}-${index}`}>
                <strong>{assessmentStatusConfig[item.status].label}</strong>
                <span>{shortDateTime(item.at)} • {item.by || 'system'}</span>
                <small>{item.note}</small>
              </div>
            )) : <div className="empty-state compact-empty">Brak historii zmian dla tej karty.</div>}
          </div>
        </section>

        <section className="assessment-detail-panel">
          <div className="section-title">
            <span>Metadane</span>
            <small>{shortDateTime(assessment.createdAt)}</small>
          </div>
          <div className="assessment-detail-grid">
            <div><span>ID karty</span><strong>{assessment.id}</strong></div>
            <div><span>Kontaktów</span><strong>{assessment.contactCount}</strong></div>
            <div><span>Źródło</span><strong>{user.role}</strong></div>
            <div><span>Ostatni wpis</span><strong>{lastEvent ? shortDateTime(lastEvent.at) : '-'}</strong></div>
          </div>
        </section>

        <footer className="modal-footer">
          {onPrint ? (
            <button className="ghost-btn" type="button" onClick={() => onPrint(assessment)}>
              <FileText size={16} /> Drukuj / PDF
            </button>
          ) : null}
          {onEdit ? (
            <button className="ghost-btn" type="button" onClick={() => onEdit(assessment)}>
              <Pencil size={16} /> Edytuj
            </button>
          ) : null}
          {onAdvance ? (
            <button className="ghost-btn" type="button" onClick={() => onAdvance(assessment)}>
              <ShieldCheck size={16} /> Zmień status
            </button>
          ) : null}
          <button className="primary-btn" type="button" onClick={onClose}>Zamknij</button>
        </footer>
      </section>
    </div>
  )
}
