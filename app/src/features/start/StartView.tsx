import { ClipboardCheck, FileText, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { TYPE_LABELS } from '../../domain/defs'
import { draftHasContent } from '../../domain/scoring'
import type { Assessment, AssessmentDraft, AssessmentType, UserProfile } from '../../domain/types'
import { AssessmentTable } from '../registry/AssessmentTable'

type ViewKey = 'start' | 'form' | 'team' | 'registry' | 'dashboard' | 'reports' | 'admin'

function canCreate(user: UserProfile): boolean {
  return ['admin', 'director', 'leader', 'assessor'].includes(user.role)
}

export default function StartView({
  user,
  assessments,
  drafts,
  setView,
  onResumeDraft,
  onClearDraft,
}: {
  user: UserProfile
  assessments: Assessment[]
  drafts: Record<AssessmentType, AssessmentDraft | undefined>
  setView: (view: ViewKey) => void
  onResumeDraft: (type: AssessmentType) => void
  onClearDraft: (type: AssessmentType) => void
}) {
  const active = assessments.filter((item) => item.status !== 'archived')
  const avg = active.length ? Math.round(active.reduce((acc, item) => acc + item.avgFinal, 0) / active.length) : 0
  const review = active.filter((item) => item.status === 'review').length
  const savedDrafts = (Object.entries(drafts) as Array<[AssessmentType, AssessmentDraft | undefined]>)
    .filter((entry): entry is [AssessmentType, AssessmentDraft] => Boolean(entry[1] && draftHasContent(entry[1])))
    .sort(([, left], [, right]) => (right.savedAt || '').localeCompare(left.savedAt || ''))

  return (
    <main className="screen">
      <section className="start-grid">
        <div className="hero-panel">
          <div className="section-title"><span>Dzisiejszy pulpit</span><small>{new Date().toLocaleDateString('pl-PL')}</small></div>
          <h1>Wybierz workflow i pracuj z jednym przypiętym panelem decyzyjnym.</h1>
          <div className="quick-actions">
            {canCreate(user) ? <button className="primary-btn" onClick={() => setView('form')} type="button"><Plus size={16} /> Nowa ocena</button> : null}
            <button className="ghost-btn" onClick={() => setView('registry')} type="button"><ClipboardCheck size={16} /> Ewidencja</button>
            <button className="ghost-btn" onClick={() => setView('reports')} type="button"><FileText size={16} /> Raport</button>
          </div>
          {savedDrafts[0] ? (
            <div className="hero-inline-note">
              <span>Ostatni szkic: {TYPE_LABELS[savedDrafts[0][0]]}</span>
              <strong>{savedDrafts[0][1].specialist || 'bez wybranego specjalisty'}</strong>
              <button className="ghost-btn" type="button" onClick={() => onResumeDraft(savedDrafts[0][0])}>
                Wznów szkic
              </button>
            </div>
          ) : null}
        </div>
        <div className="metric-panel"><span>Karty aktywne</span><strong>{active.length}</strong><small>dla zakresu: {user.role}</small></div>
        <div className="metric-panel"><span>Średni wynik</span><strong>{avg || '-'}%</strong><small>cel minimum 92%</small></div>
        <div className="metric-panel"><span>W weryfikacji</span><strong>{review}</strong><small>wymagają decyzji</small></div>
      </section>
      <section className="data-panel">
        <div className="section-title"><span>Szkice robocze</span><small>{savedDrafts.length ? `${savedDrafts.length} zapisane` : 'brak aktywnych szkiców'}</small></div>
        {savedDrafts.length ? (
          <div className="draft-grid">
            {savedDrafts.map(([type, draft]) => (
              <article className="draft-card" key={type}>
                <div className="draft-card-top">
                  <span className="type-badge">{TYPE_LABELS[type]}</span>
                  <small>{draft.savedAt ? new Date(draft.savedAt).toLocaleString('pl-PL') : 'Zapis lokalny'}</small>
                </div>
                <strong>{draft.specialist || 'Szkic bez wybranego specjalisty'}</strong>
                <p>{draft.summary || `${draft.contactCount} kontakt(y), okres ${draft.period || '-'}`}</p>
                <div className="draft-card-meta">
                  <span>{draft.position || 'Brak stanowiska'}</span>
                  <span>{draft.department || 'Brak działu'}</span>
                </div>
                <div className="draft-card-actions">
                  <button className="primary-btn" type="button" onClick={() => onResumeDraft(type)}>
                    <RotateCcw size={15} /> Wznów szkic
                  </button>
                  <button className="ghost-btn" type="button" onClick={() => onClearDraft(type)}>
                    <Trash2 size={15} /> Wyczyść
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="empty-state">Brak zapisanych szkiców. Formularz zapisuje postęp lokalnie przy każdej zmianie.</div>}
      </section>
      <section className="data-panel">
        <div className="section-title"><span>Ostatnie karty</span><small>Top 8</small></div>
        <AssessmentTable assessments={active.slice(0, 8)} compact />
      </section>
    </main>
  )
}
