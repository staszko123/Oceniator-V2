import { ClipboardCheck, FileText, Plus, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react'
import { TYPE_LABELS } from '../../domain/defs'
import { canCreateRole } from '../../domain/access'
import { draftHasContent } from '../../domain/scoring'
import type { Assessment, AssessmentDraft, AssessmentType, UserProfile } from '../../domain/types'
import { AssessmentTable } from '../registry/AssessmentTable'

type ViewKey = 'start' | 'form' | 'team' | 'registry' | 'dashboard' | 'reports' | 'admin'

function roleLabel(role: UserProfile['role']): string {
  if (role === 'admin') return 'Administrator'
  if (role === 'director') return 'Dyrektor'
  if (role === 'leader') return 'Lider'
  if (role === 'assessor') return 'Oceniajacy'
  return 'Specjalista'
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
      label: 'Do decyzji',
      value: decisionCount,
      hint: 'Karty wymagajace decyzji lub review.',
      action: () => openRegistry('decision'),
    },
    {
      label: 'Ryzyka do sprawdzenia',
      value: lowScores,
      hint: 'Karty ponizej standardu do szybkiej kontroli.',
      action: () => setView('dashboard'),
    },
  ].filter((item) => item.value > 0) as Array<{ label: string; value: number; hint: string; action: () => void }>

  return (
    <main className="screen start-screen">
      <section className="start-hero-grid">
        <div className="hero-panel">
          <div className="section-title"><span>Start dnia</span><small>{new Date().toLocaleDateString('pl-PL')}</small></div>
          <h1>Najpierw zobacz, co wymaga decyzji. Potem przejdz do nowej oceny albo dalszej pracy.</h1>
          <div className="quick-actions">
            {canCreateRole(user.role) ? <button className="primary-btn" onClick={() => setView('form')} type="button"><Plus size={16} /> Nowa ocena</button> : null}
            <button className="ghost-btn" onClick={() => openRegistry('all')} type="button"><ClipboardCheck size={16} /> Ewidencja</button>
          </div>
          <div className="hero-inline-note">
            <span>Rola robocza: {roleLabel(user.role)}</span>
            <strong>{user.fullName}</strong>
            <small className="hero-inline-meta">{decisionCount ? `${decisionCount} kart czeka na decyzje lub review` : 'Brak kart wymagajacych decyzji w tym momencie'}</small>
          </div>
        </div>
        <div className="metric-panel"><span>Karty do pracy</span><strong>{active.length}</strong><small>aktualny obieg dla tej roli</small></div>
        <div className="metric-panel"><span>Do decyzji</span><strong>{decisionCount}</strong><small>Karty wymagajace decyzji lub review.</small></div>
        <div className="metric-panel"><span>Poniżej standardu</span><strong>{lowScores}</strong><small>Karty do szybkiego sprawdzenia.</small></div>
      </section>

      <section className="start-center-grid">
        <div className="data-panel">
          <div className="section-title"><span>Priorytet</span><small>co wymaga uwagi teraz</small></div>
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
            <div className="empty-state compact-empty">Brak pilnych zadan operacyjnych dla aktualnego zakresu.</div>
          )}
        </div>

        <div className="data-panel">
          <div className="section-title"><span>Skróty</span><small>najkrótsza droga dalej</small></div>
          <div className="quick-paths">
            <button className="quick-path" type="button" onClick={() => setView('form')}>
              <Plus size={16} />
              <span>
                <strong>Nowa ocena</strong>
                <small>otwórz formularz od razu</small>
              </span>
            </button>
            <button className="quick-path" type="button" onClick={() => openRegistry('all')}>
              <ClipboardCheck size={16} />
              <span>
                <strong>Ewidencja</strong>
                <small>sprawdź karty i statusy</small>
              </span>
            </button>
            <button className="quick-path" type="button" onClick={() => setView('dashboard')}>
              <ShieldCheck size={16} />
              <span>
                <strong>Analityka</strong>
                <small>zobacz priorytety i trendy</small>
              </span>
            </button>
            <button className="quick-path" type="button" onClick={() => setView('reports')}>
              <FileText size={16} />
              <span>
                <strong>Raporty</strong>
                <small>przejdź do eksportów i zestawień</small>
              </span>
            </button>
          </div>
        </div>
      </section>

      <details className="start-details data-panel">
        <summary>
          <span>Szczegóły</span>
          <small>{savedDrafts.length ? `${savedDrafts.length} zapisane szkice` : 'ukryte statystyki i ostatnie karty'}</small>
        </summary>
        <div className="start-details-grid">
          <div className="detail-metric"><span>Średni wynik</span><strong>{active.length ? Math.round(active.reduce((acc, item) => acc + item.avgFinal, 0) / active.length) : '-'}%</strong></div>
          <div className="detail-metric"><span>Do decyzji</span><strong>{decisionCount}</strong></div>
          <div className="detail-metric"><span>Poniżej standardu</span><strong>{lowScores}</strong></div>
          <div className="detail-metric"><span>Rola</span><strong>{roleLabel(user.role)}</strong></div>
        </div>

        <div className="section-title nested">
          <span>Zapisane szkice</span>
          <small>{savedDrafts.length ? `${savedDrafts.length} aktywne` : 'brak aktywnych szkicow'}</small>
        </div>
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
                  <span>{draft.department || 'Brak dzialu'}</span>
                </div>
                <div className="draft-card-actions">
                  <button className="primary-btn" type="button" onClick={() => onResumeDraft(type)}>
                    <RotateCcw size={15} /> Wznow szkic
                  </button>
                  <button className="ghost-btn" type="button" onClick={() => onClearDraft(type)}>
                    <Trash2 size={15} /> Wyczysc
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="empty-state">Brak zapisanych szkicow. Formularz zapisuje postep lokalnie przy kazdej zmianie.</div>}

        <div className="section-title nested">
          <span>Ostatnie karty</span>
          <small>{recentCards.length ? `Top ${recentCards.length}` : 'brak danych'}</small>
        </div>
        <AssessmentTable assessments={recentCards} compact />
      </details>
    </main>
  )
}
