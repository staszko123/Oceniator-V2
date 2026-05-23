import { useMemo, useState } from 'react'
import { FileText, Mail, MonitorCog, PhoneCall, Save, ShieldCheck, Trash2 } from 'lucide-react'
import { ASSESSMENT_DEFS, SCORE_OPTIONS, TYPE_LABELS } from '../../domain/defs'
import { calculateDraft, createDraft, periodOf, ratingLabel, resizeDraft } from '../../domain/scoring'
import type { AdminConfig, AssessmentDraft, AssessmentType, ScoreValue, UserProfile } from '../../domain/types'
import { buildDraftSummary, reviewDraftQuality, type DraftAssistantResult } from './assistant'

function scoreClass(score: number): string {
  if (score >= 92) return 'score score-great'
  if (score >= 82) return 'score score-good'
  return 'score score-below'
}

function typeIcon(type: AssessmentType) {
  if (type === 'r') return <><PhoneCall size={15} /> {TYPE_LABELS.r}</>
  if (type === 'm') return <><Mail size={15} /> {TYPE_LABELS.m}</>
  return <><MonitorCog size={15} /> {TYPE_LABELS.s}</>
}

function canCreate(user: UserProfile): boolean {
  return ['admin', 'director', 'leader', 'assessor'].includes(user.role)
}

function readableError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error.trim()) return error
  return fallback
}

export default function EvaluationView({
  user,
  admin,
  draft,
  onSelectType,
  onDraftChange,
  onSaveAssessment,
}: {
  user: UserProfile
  admin: AdminConfig
  draft: AssessmentDraft
  onSelectType: (type: AssessmentType) => void
  onDraftChange: (draft: AssessmentDraft) => void
  onSaveAssessment: (draft: AssessmentDraft) => Promise<void>
}) {
  const [notice, setNotice] = useState('')
  const [assistantResult, setAssistantResult] = useState<DraftAssistantResult | null>(null)
  const def = ASSESSMENT_DEFS[draft.type]
  const calculated = useMemo(() => calculateDraft(draft), [draft])
  const specialists = useMemo(() => {
    if (user.role === 'admin' || user.role === 'director') return admin.specialists.filter((item) => item.active)
    return admin.specialists.filter((item) => item.active && item.leader === user.leaderScope)
  }, [admin.specialists, user])
  const draftSaveState = draft.savedAt
    ? `Szkic lokalny zapisany o ${new Date(draft.savedAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`
    : 'Zmiany są zapisywane lokalnie po każdej edycji.'

  function update(next: AssessmentDraft) {
    if (notice) setNotice('')
    if (assistantResult) setAssistantResult(null)
    onDraftChange(next)
  }

  function updateField(field: keyof AssessmentDraft, value: AssessmentDraft[keyof AssessmentDraft]) {
    update({ ...draft, [field]: value })
  }

  function selectSpecialist(name: string) {
    const person = specialists.find((item) => item.name === name)
    update({
      ...draft,
      specialist: name,
      position: person?.position || draft.position,
      department: person?.department || draft.department,
      assessor: draft.assessor || user.fullName || user.email,
    })
  }

  function setScore(sectionKey: string, criterionIndex: number, contactIndex: number, value: ScoreValue) {
    const scores = structuredClone(draft.scores)
    scores[sectionKey][criterionIndex][contactIndex] = value
    update({ ...draft, scores })
  }

  function setSectionNote(sectionKey: string, contactIndex: number, value: string) {
    const notes = structuredClone(draft.notes)
    notes[sectionKey][contactIndex] = value
    update({ ...draft, notes })
  }

  function runDraftGuard() {
    setAssistantResult(reviewDraftQuality(draft))
  }

  function generateSummary() {
    const summary = buildDraftSummary(draft)
    update({ ...draft, summary })
    setAssistantResult({
      status: 'ok',
      title: 'Generator podsumowania',
      summary: 'Wygenerowano robocze podsumowanie na podstawie sekcji i wyników.',
      warnings: [],
      suggestions: ['Przejrzyj tekst przed zapisem i dopasuj go do realnego feedbacku dla specjalisty.'],
    })
  }

  async function submit() {
    if (!draft.specialist.trim()) {
      setNotice('Wybierz specjalistę przed zapisem.')
      return
    }
    if (!draft.contactIds.some(Boolean)) {
      setNotice('Uzupełnij co najmniej jeden identyfikator kontaktu.')
      return
    }
    try {
      await onSaveAssessment({
        ...draft,
        assessor: draft.assessor || user.fullName || user.email,
      })
      setNotice('Karta dodana do ewidencji.')
    } catch (error) {
      setNotice(readableError(error, 'Nie udało się zapisać karty.'))
    }
  }

  return (
    <main className="screen form-screen">
      <section className="form-main">
        <div className="type-tabs">
          {(Object.keys(ASSESSMENT_DEFS) as AssessmentType[]).map((item) => (
            <button
              key={item}
              className={draft.type === item ? 'active' : ''}
              onClick={() => {
                if (item !== draft.type) onSelectType(item)
              }}
              type="button"
            >
              {typeIcon(item)}
            </button>
          ))}
        </div>
        <div className="form-card meta-card">
          <div className="field-grid">
            <label>
              <span>Specjalista</span>
              <input list="specialists" value={draft.specialist} onChange={(event) => selectSpecialist(event.target.value)} placeholder="Zacznij wpisywać..." />
              <datalist id="specialists">
                {specialists.map((item) => <option key={item.id} value={item.name} />)}
              </datalist>
            </label>
            <label>
              <span>Data oceny</span>
              <input
                type="date"
                value={draft.date}
                onChange={(event) => update({ ...draft, date: event.target.value, period: periodOf(event.target.value) })}
              />
            </label>
            <label>
              <span>Stanowisko</span>
              <input value={draft.position} onChange={(event) => updateField('position', event.target.value)} />
            </label>
            <label>
              <span>Dział</span>
              <input value={draft.department} onChange={(event) => updateField('department', event.target.value)} />
            </label>
          </div>
          <div className="contact-strip">
            <span>Liczba {def.pluralLabel}</span>
            <button type="button" onClick={() => update(resizeDraft(draft, draft.contactCount - 1))}>-</button>
            <strong>{draft.contactCount}</strong>
            <button type="button" onClick={() => update(resizeDraft(draft, draft.contactCount + 1))}>+</button>
            <em>{draft.period}</em>
          </div>
          <div className="contact-ids" style={{ gridTemplateColumns: `repeat(${draft.contactCount}, minmax(0, 1fr))` }}>
            {draft.contactIds.map((value, index) => (
              <label key={index}>
                <span>{def.contactLabel} {index + 1}</span>
                <input
                  value={value}
                  onChange={(event) => {
                    const contactIds = [...draft.contactIds]
                    contactIds[index] = event.target.value
                    update({ ...draft, contactIds })
                  }}
                  placeholder="ID / numer sprawy"
                />
              </label>
            ))}
          </div>
        </div>
        {def.sections.map((section) => (
          <section className="score-section" key={section.key}>
            <header>
              <h3>{section.label}</h3>
              <span>waga {Math.round(section.weight * 100)}%</span>
            </header>
            <table className="score-table">
              <thead>
                <tr>
                  <th>Kryterium</th>
                  {Array.from({ length: draft.contactCount }, (_, index) => <th key={index}>{def.contactLabel} {index + 1}</th>)}
                </tr>
              </thead>
              <tbody>
                {section.criteria.map((criterion, criterionIndex) => (
                  <tr key={criterion.name}>
                    <td>
                      <strong>{criterion.name}</strong>
                      <small>{criterion.hint}</small>
                    </td>
                    {Array.from({ length: draft.contactCount }, (_, contactIndex) => {
                      const current = draft.scores[section.key]?.[criterionIndex]?.[contactIndex] ?? 1
                      return (
                        <td key={contactIndex}>
                          <div className="score-buttons">
                            {SCORE_OPTIONS.map((option) => (
                              <button
                                key={option.label}
                                className={current === option.value ? 'selected' : ''}
                                onClick={() => setScore(section.key, criterionIndex, contactIndex, option.value)}
                                title={option.title}
                                type="button"
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
                <tr className="notes-row">
                  <td>Uwagi do sekcji</td>
                  {Array.from({ length: draft.contactCount }, (_, contactIndex) => (
                    <td key={contactIndex}>
                      <textarea
                        value={draft.notes[section.key]?.[contactIndex] ?? ''}
                        onChange={(event) => setSectionNote(section.key, contactIndex, event.target.value)}
                        placeholder="Uwagi..."
                      />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </section>
        ))}
        <section className="form-card">
          <div className="field-grid two">
            <label>
              <span>Złote punkty</span>
              <div className="gold-row">
                {draft.gold.map((value, index) => (
                  <select
                    key={index}
                    value={value}
                    onChange={(event) => {
                      const gold = [...draft.gold]
                      gold[index] = Number(event.target.value)
                      update({ ...draft, gold })
                    }}
                  >
                    <option value={0}>{def.contactLabel} {index + 1}: 0</option>
                    <option value={0.5}>{def.contactLabel} {index + 1}: +0,5</option>
                    <option value={1}>{def.contactLabel} {index + 1}: +1</option>
                  </select>
                ))}
              </div>
            </label>
            <label>
              <span>Opis / podsumowanie</span>
              <textarea value={draft.summary} onChange={(event) => updateField('summary', event.target.value)} placeholder="Wnioski i plan działania..." />
            </label>
          </div>
        </section>
      </section>
      <aside className="right-rail">
        <section className="rail-card">
          <div className="section-title"><span>Akcje</span><small>{notice || draftSaveState}</small></div>
          <button className="primary-btn wide" onClick={submit} disabled={!canCreate(user)} type="button"><Save size={16} /> Dodaj kartę</button>
          <button className="ghost-btn wide" onClick={() => update(createDraft(draft.type))} type="button"><Trash2 size={16} /> Wyczyść szkic</button>
        </section>
        <section className="rail-card assistant-card">
          <div className="section-title"><span>Asystent oceny</span><small>inspiracja z legacy, przebudowana pod v2</small></div>
          <div className="assistant-actions">
            <button className="ghost-btn wide" type="button" onClick={runDraftGuard}><ShieldCheck size={16} /> Sprawdź kartę</button>
            <button className="ghost-btn wide" type="button" onClick={generateSummary}><FileText size={16} /> Wygeneruj podsumowanie</button>
          </div>
          {assistantResult ? (
            <div className={`assistant-result ${assistantResult.status}`}>
              <strong>{assistantResult.title}</strong>
              <p>{assistantResult.summary}</p>
              {assistantResult.warnings.length ? (
                <div>
                  <span>Ryzyka</span>
                  <ul>
                    {assistantResult.warnings.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ) : null}
              {assistantResult.suggestions.length ? (
                <div>
                  <span>Sugestie</span>
                  <ul>
                    {assistantResult.suggestions.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : <p className="hint-text">Użyj kontroli jakości przed zapisem albo wygeneruj pierwsza wersje komentarza koncowego.</p>}
        </section>
        <section className="rail-card result-card">
          <div className="section-title"><span>Wynik koncowy</span><small>{ratingLabel(calculated.rating)}</small></div>
          <div className={scoreClass(calculated.avgFinal)}>{calculated.avgFinal}%</div>
          {calculated.results.map((result, index) => (
            <div className="mini-result" key={index}>
              <span>{def.contactLabel} {index + 1}</span>
              <strong>{result.pct}%</strong>
              <small>{result.pts.sum} / {result.pts.max} pkt</small>
            </div>
          ))}
        </section>
        <section className="rail-card">
          <div className="section-title"><span>Kontekst</span><small>{draft.specialist || 'Brak specjalisty'}</small></div>
          <p className="hint-text">Panel pozostaje przypiety po prawej stronie i nie nachodzi na formularz.</p>
        </section>
      </aside>
    </main>
  )
}
