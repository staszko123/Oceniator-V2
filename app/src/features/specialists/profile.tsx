import { useMemo, useState } from 'react'
import { FileText, X } from 'lucide-react'
import { TYPE_LABELS } from '../../domain/defs'
import type { Assessment, AssessmentStatus } from '../../domain/types'
import { printSpecialistProfileReport, specialistProfileData } from './profileData'

const statusLabels: Record<AssessmentStatus, string> = {
  submitted: 'Do weryfikacji',
  review: 'W weryfikacji',
  approved: 'Zatwierdzona',
  archived: 'Archiwum',
}

function scoreClass(score: number): string {
  if (score >= 92) return 'score score-great'
  if (score >= 82) return 'score score-good'
  return 'score score-below'
}

export function SpecialistProfileModal({
  specialist,
  assessments,
  onClose,
}: {
  specialist: string
  assessments: Assessment[]
  onClose: () => void
}) {
  const profile = useMemo(() => specialistProfileData(assessments, specialist), [assessments, specialist])
  const [printNotice, setPrintNotice] = useState('')

  if (!profile.rows.length) return null

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="modal-card preview-modal specialist-profile-modal">
        <header className="modal-header">
          <div>
            <h3>{specialist}</h3>
            <p>Profil jakosciowy specjalisty oparty o zapisane karty.</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="specialist-kpi-grid">
          <div><span>Sredni wynik</span><strong className={scoreClass(profile.avg)}>{profile.avg}%</strong></div>
          <div><span>Liczba kart</span><strong>{profile.rows.length}</strong></div>
          <div><span>Ponizej standardu</span><strong>{profile.below}</strong></div>
          <div><span>Kolejka decyzji</span><strong>{profile.review}</strong></div>
        </div>
        <div className="specialist-profile-grid">
          <section className="specialist-profile-panel">
            <div className="section-title"><span>Trend ostatnich ocen</span><small>{profile.momentum >= 0 ? `+${profile.momentum}` : profile.momentum} pp</small></div>
            <div className="specialist-trend-bars">
              {profile.trend.map((item) => (
                <div className="specialist-trend-bar" key={item.id}>
                  <div className="specialist-trend-meta">
                    <strong>{item.score}%</strong>
                    <small>{TYPE_LABELS[item.type]}</small>
                  </div>
                  <div className="specialist-trend-track"><i style={{ height: `${Math.max(12, item.score)}%` }} /></div>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="specialist-profile-panel">
            <div className="section-title"><span>Obszary do poprawy</span><small>{profile.weakAreas.length} pozycji</small></div>
            <div className="weak-list enhanced">
              {profile.weakAreas.length ? profile.weakAreas.map((item) => (
                <div className="weak-item" key={item.label}>
                  <span>{item.label}</span>
                  <strong className={scoreClass(item.avg)}>{item.avg}%</strong>
                  <small>{item.count} ocen czastkowych</small>
                </div>
              )) : <div className="empty-state compact">Brak wystarczajacej liczby danych do wskazania slabych kryteriow.</div>}
            </div>
            <p className="hint-text specialist-profile-reco">{profile.recommendation}</p>
          </section>
        </div>
        <section className="specialist-profile-panel specialist-profile-full">
          <div className="section-title"><span>Ostatnie oceny</span><small>{profile.recent.length} najnowszych kart</small></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Data</th><th>Typ</th><th>Wynik</th><th>Status</th><th>Podsumowanie</th></tr></thead>
              <tbody>
                {profile.recent.map((item) => (
                  <tr key={item.id}>
                    <td>{item.data}</td>
                    <td>{TYPE_LABELS[item.type]}</td>
                    <td><span className={scoreClass(item.avgFinal)}>{item.avgFinal}%</span></td>
                    <td><span className={`status ${item.status}`}>{statusLabels[item.status]}</span></td>
                    <td><small>{item.notes || 'Brak podsumowania koncowego.'}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <footer className="modal-footer">
          {printNotice ? <span className="hint-text">{printNotice}</span> : null}
          <button
            className="ghost-btn"
            type="button"
            onClick={() => setPrintNotice(printSpecialistProfileReport(specialist, assessments) ? '' : 'Przegladarka zablokowala okno drukowania/PDF.')}
          >
            <FileText size={16} /> Drukuj / PDF
          </button>
          <button className="primary-btn" type="button" onClick={onClose}>Zamknij</button>
        </footer>
      </section>
    </div>
  )
}
