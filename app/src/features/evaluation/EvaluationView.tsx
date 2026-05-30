import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, ChevronDown, FileText, Mail, MonitorCog, PhoneCall, Save, ShieldCheck, Trash2 } from 'lucide-react'
import { canCreateRole } from '../../domain/access'
import { getErrorMessage } from '../../domain/errors'
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

function canAutofillSpecialist(draft: AssessmentDraft): boolean {
  return !draft.specialist.trim()
    && !draft.position.trim()
    && !draft.department.trim()
    && !draft.summary.trim()
    && !draft.goldDescription.trim()
    && !draft.contactIds.some((item) => item.trim())
    && !draft.gold.some((item) => item > 0)
    && !Object.values(draft.notes).some((items) => items.some((item) => item.trim()))
}

export default function EvaluationView({
  user,
  admin,
  draft,
  specialistPrefillName,
  specialistPrefillToken,
  onSelectType,
  onDraftChange,
  onSaveAssessment,
}: {
  user: UserProfile
  admin: AdminConfig
  draft: AssessmentDraft
  specialistPrefillName?: string
  specialistPrefillToken?: number
  onSelectType: (type: AssessmentType) => void
  onDraftChange: (draft: AssessmentDraft) => void
  onSaveAssessment: (draft: AssessmentDraft) => Promise<void>
}) {
  const [notice, setNotice] = useState('')
  const [assistantResult, setAssistantResult] = useState<DraftAssistantResult | null>(null)
  const [focusMode, setFocusMode] = useState(false)
  const lastPrefillToken = useRef<number | null>(null)
  const def = ASSESSMENT_DEFS[draft.type]
  const calculated = useMemo(() => calculateDraft(draft), [draft])
  const specialists = useMemo(() => {
    if (user.role === 'admin' || user.role === 'director') return admin.specialists.filter((item) => item.active)
    return admin.specialists.filter((item) => item.active && item.leader === user.leaderScope)
  }, [admin.specialists, user])
  const draftSaveState = draft.savedAt
    ? `Szkic lokalny zapisany o ${new Date(draft.savedAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`
    : 'Zmiany sa zapisywane lokalnie po kazdej edycji.'
  const filledIds = draft.contactIds.filter((item) => item.trim()).length
  const noteCount = Object.values(draft.notes).reduce((sum, items) => sum + items.filter((item) => item.trim()).length, 0)
  const lowScoreCount = Object.values(draft.scores).reduce((sum, rows) => sum + rows.reduce((rowSum, row) => rowSum + row.filter((value) => value === 0 || value === 0.5).length, 0), 0)
  const hasCriteriaChanges = Object.values(draft.scores).some((sections) =>
    sections.some((criteria) => criteria.some((value) => value !== 1)),
  )
  const completionPoints = [
    draft.specialist.trim() ? 1 : 0,
    draft.date ? 1 : 0,
    filledIds > 0 ? 1 : 0,
    hasCriteriaChanges ? 1 : 0,
    noteCount > 0 || draft.summary.trim() ? 1 : 0,
  ]
  const completion = Math.round(completionPoints.reduce((acc, value) => acc + value, 0) / completionPoints.length * 100)
  const workflowSteps = [
    { label: 'Dane oceny', done: Boolean(draft.specialist.trim() && draft.date && draft.position.trim() && draft.department.trim()) },
    { label: 'Kontakty lub sprawy', done: filledIds > 0 },
    { label: 'Ocena kryteriow', done: hasCriteriaChanges },
    { label: 'Komentarze', done: noteCount > 0 || draft.goldDescription.trim().length > 0 },
    { label: 'Podsumowanie', done: draft.summary.trim().length > 0 },
    { label: 'Zapis', done: Boolean(draft.savedAt) },
  ]
  const workflowSectionMap: Record<string, string> = {
    'Dane oceny': 'section-data',
    'Kontakty lub sprawy': 'section-contacts',
    'Ocena kryteriow': 'section-criteria',
    'Komentarze': 'section-comments',
    'Podsumowanie': 'section-summary',
    'Zapis': 'section-summary',
  }
  const activeStepIndex = workflowSteps.findIndex((item) => !item.done)
  const currentStepIndex = activeStepIndex === -1 ? workflowSteps.length - 1 : activeStepIndex
  const currentStep = workflowSteps[currentStepIndex]
  const nextStep = workflowSteps.find((item) => !item.done) || workflowSteps[workflowSteps.length - 1]
  const completedStepCount = workflowSteps.filter((item) => item.done).length
  const missingItems = [
    !draft.specialist.trim() ? 'Wybierz specjaliste' : '',
    !draft.date ? 'Uzupelnij date oceny' : '',
    filledIds === 0 ? 'Dodaj kontakt lub sprawe' : '',
    !draft.goldDescription.trim() && noteCount === 0 ? 'Dodaj komentarz do oceny' : '',
    !draft.summary.trim() ? 'Uzupelnij podsumowanie' : '',
  ].filter(Boolean) as string[]
  const completionLabel = missingItems.length ? `Brakuje ${missingItems.length} elementow do zapisu` : 'Karta jest gotowa do zapisu'
  const completionTone = missingItems.length ? 'warning' : 'ok'

  useEffect(() => {
    if (!specialistPrefillName || !specialistPrefillToken) return
    if (lastPrefillToken.current === specialistPrefillToken) return
    lastPrefillToken.current = specialistPrefillToken
    if (!canAutofillSpecialist(draft)) return
    const person = specialists.find((item) => item.name === specialistPrefillName)
    onDraftChange({
      ...draft,
      specialist: specialistPrefillName,
      position: person?.position || draft.position,
      department: person?.department || draft.department,
      assessor: draft.assessor || user.fullName || user.email,
    })
  }, [draft, onDraftChange, specialistPrefillName, specialistPrefillToken, specialists, user])

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

  function setContactCount(nextCount: number) {
    update(resizeDraft(draft, nextCount))
  }

  function setGold(contactIndex: number, value: number) {
    const gold = [...draft.gold]
    gold[contactIndex] = value
    update({ ...draft, gold })
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
      summary: 'Wygenerowano robocze podsumowanie na podstawie sekcji i wynikow.',
      warnings: [],
      suggestions: ['Przejrzyj tekst przed zapisem i dopasuj go do realnego feedbacku dla specjalisty.'],
    })
  }

  function jumpToSection(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function submit() {
    if (!draft.specialist.trim()) {
      setNotice('Wybierz specjaliste przed zapisem.')
      return
    }
    if (!draft.contactIds.some(Boolean)) {
      setNotice('Uzupelnij co najmniej jeden identyfikator kontaktu.')
      return
    }
    try {
      await onSaveAssessment({
        ...draft,
        assessor: draft.assessor || user.fullName || user.email,
      })
      setNotice('Karta dodana do ewidencji.')
    } catch (error) {
      setNotice(getErrorMessage(error, 'Nie udalo sie zapisac karty.'))
    }
  }

  return (
    <main className={`screen form-screen evaluation-screen ${focusMode ? 'focus-mode' : ''}`}>
      <section className="form-main">
        <div className="form-toolbar">
          <div className="section-title">
            <span>Ocena rozmow</span>
            <small>{currentStep ? `Aktualny etap: ${currentStep.label}` : 'Praca krok po kroku'}</small>
          </div>
          <div className="form-toolbar-actions">
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
            <button
              className={`focus-toggle ${focusMode ? 'active' : ''}`}
              type="button"
              onClick={() => setFocusMode((value) => !value)}
              aria-pressed={focusMode}
            >
              <ChevronDown size={15} />
              Tryb skupienia
            </button>
          </div>
        </div>

        <section className="workflow-banner">
          <div className="workflow-banner-copy">
            <span>{completedStepCount}/{workflowSteps.length} krokow gotowe</span>
            <strong>{nextStep.label}</strong>
            <p>{focusMode ? 'Tryb skupienia pokazuje tylko glowny przeplyw i panel zapisu.' : 'Nastepny krok jest wskazany ponizej. Wejdz tam, gdzie formularz wymaga decyzji.'}</p>
          </div>
          <div className="workflow-banner-actions">
            <div className="workflow-banner-pill">
              {completion}% kompletności
            </div>
            <button className="primary-btn" type="button" onClick={() => jumpToSection(workflowSectionMap[nextStep.label])}>
              Przejdz do kroku
            </button>
          </div>
        </section>

        {!focusMode ? (
          <div className="section-jump-bar">
            {workflowSteps.map((step) => (
              <button
                key={step.label}
                className={step.label === currentStep?.label ? 'active' : ''}
                type="button"
                onClick={() => jumpToSection(workflowSectionMap[step.label])}
              >
                {step.label}
              </button>
            ))}
          </div>
        ) : null}

        <section className="form-card meta-card step-card" id="section-data">
          <header className="step-header">
            <div>
              <span className="step-index">1</span>
              <div>
                <h3>Dane oceny</h3>
                <p>Wybierz typ, specjalistę i podstawowe dane karty.</p>
              </div>
            </div>
            <small>{draftSaveState}</small>
          </header>
          <div className="field-grid">
            <label>
              <span>Specjalista</span>
              <input list="specialists" value={draft.specialist} onChange={(event) => selectSpecialist(event.target.value)} placeholder="Zacznij wpisywac..." />
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
            <div className="readonly-field">
              <span>Stanowisko</span>
              <strong>{draft.position.trim() || 'Wybrane automatycznie po wskazaniu specjalisty'}</strong>
              <small>Tylko do podglądu. Uzupełnia się z profilu specjalisty.</small>
            </div>
            <div className="readonly-field">
              <span>Dział</span>
              <strong>{draft.department.trim() || 'Wybrany automatycznie po wskazaniu specjalisty'}</strong>
              <small>Tylko do podglądu. Uzupełnia się z profilu specjalisty.</small>
            </div>
          </div>
        </section>

        <section className="form-card step-card" id="section-contacts">
          <header className="step-header">
            <div>
              <span className="step-index">2</span>
              <div>
                <h3>Kontakty lub sprawy</h3>
                <p>Ustal liczbę kontaktów i wpisz identyfikatory do oceny.</p>
              </div>
            </div>
            <small>{filledIds} / {draft.contactCount}</small>
          </header>
          <div className="contact-strip">
            <div className="contact-stepper">
              <span>Liczba {def.pluralLabel}</span>
              <div className="contact-stepper-controls">
                <button type="button" onClick={() => setContactCount(draft.contactCount - 1)} aria-label={`Zmniejsz liczbe ${def.pluralLabel.toLowerCase()}`}>-</button>
                <strong>{draft.contactCount}</strong>
                <button type="button" onClick={() => setContactCount(draft.contactCount + 1)} aria-label={`Zwieksz liczbe ${def.pluralLabel.toLowerCase()}`}>+</button>
              </div>
            </div>
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
        </section>

        <section className="form-card step-card" id="section-criteria">
          <header className="step-header">
            <div>
              <span className="step-index">3</span>
              <div>
                <h3>Ocena kryteriów</h3>
                <p>Wypełnij tabelę i zaznacz uwagi tylko tam, gdzie są potrzebne.</p>
              </div>
            </div>
            <small>{lowScoreCount} obnizonych ocen</small>
          </header>

          {def.sections.map((section) => (
            <section className="score-section" id={`section-${section.key}`} key={section.key}>
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

          {!focusMode ? (
            <details className="subdetails gold-callout">
              <summary>
                <span>DODAJ ZŁOTY PUNKT</span>
                <small>jedna sekcja na bonus i uzasadnienie</small>
              </summary>
              <div className="gold-single-card">
                <div className="gold-single-head">
                  <div>
                    <strong>Złoty punkt</strong>
                    <p>Wszystkie dane bonusu trzymaj w jednym miejscu, żeby zapis był prosty i czytelny.</p>
                  </div>
                  <span>{draft.gold.some((item) => item > 0) ? 'Uzupełniony' : 'Do uzupełnienia'}</span>
                </div>
                <div className="gold-list gold-section-body">
                  {draft.gold.map((value, index) => (
                    <article className="gold-row-card" key={index}>
                      <div className="gold-row-head">
                        <strong>{def.contactLabel} {index + 1}</strong>
                        <span>{value > 0 ? `Bonus +${String(value).replace('.', ',')}` : 'Bez bonusu'}</span>
                      </div>
                      <div className="score-buttons gold-buttons">
                        {[0, 0.5, 1].map((option) => (
                          <button
                            key={option}
                            className={value === option ? 'selected' : ''}
                            type="button"
                            onClick={() => setGold(index, option)}
                          >
                            {option === 0 ? '0' : `+${String(option).replace('.', ',')}`}
                          </button>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
                <label className="gold-single-note">
                  <span>Uzasadnienie złotego punktu</span>
                  <textarea
                    value={draft.goldDescription}
                    onChange={(event) => updateField('goldDescription', event.target.value)}
                    placeholder="Opisz konkretne zachowanie, sytuację lub efekt, który uzasadnia bonus."
                  />
                </label>
              </div>
            </details>
          ) : null}
        </section>

        <section className="form-card step-card" id="section-comments">
          <header className="step-header">
            <div>
              <span className="step-index">4</span>
              <div>
                <h3>Komentarze</h3>
                <p>Dodaj uzasadnienie bonusów i krótkie komentarze do karty.</p>
              </div>
            </div>
            <small>{noteCount} notatek</small>
          </header>
          <div className="field-grid two">
            <div className="comment-helper">
              <span>Uzasadnienie złotego punktu</span>
              <div className="section-note">
                {draft.goldDescription.trim() || 'Uzupełnij w sekcji „DODAJ ZŁOTY PUNKT”.'}
              </div>
            </div>
            <div className="comment-helper">
              <span>Wskazówka do podsumowania</span>
              <div className="section-note">
                {assistantResult?.summary || 'Po sprawdzeniu karty pojawi się tu krótka wskazówka do podsumowania.'}
              </div>
            </div>
          </div>          {!focusMode ? (
            <div className="section-note">
              <span>Uwagi do sekcji sa wpisywane przy kryteriach. To pole sluzy tylko do kontekstu bonusów.</span>
            </div>
          ) : null}
        </section>

        <section className="form-card step-card" id="section-summary">
          <header className="step-header">
            <div>
              <span className="step-index">5</span>
              <div>
                <h3>Podsumowanie</h3>
                <p>Sprawdź końcowy wynik, gotowość i krótki obraz karty.</p>
              </div>
            </div>
            <small>{completion}% gotowe</small>
          </header>
          <div className="summary-grid">
            <article>
              <span>Wynik końcowy</span>
              <strong>{calculated.avgFinal}%</strong>
              <small>{ratingLabel(calculated.rating)}</small>
            </article>
            <article>
              <span>Kompletność</span>
              <strong>{completion}%</strong>
              <small>{completionLabel}</small>
            </article>
            <article>
              <span>Szkic</span>
              <strong>{draft.savedAt ? 'Zapisany' : 'Roboczy'}</strong>
              <small>{draftSaveState}</small>
            </article>
          </div>
          <label className="summary-editor">
            <span>Opis / podsumowanie</span>
            <textarea value={draft.summary} onChange={(event) => updateField('summary', event.target.value)} placeholder="Wnioski i plan dzialania..." />
          </label>
        </section>
      </section>

      <aside className="right-rail">
        <section className="rail-card result-card">
          <div className="section-title">
            <span>Wynik koncowy</span>
            <small>{ratingLabel(calculated.rating)}</small>
          </div>
          <div className={scoreClass(calculated.avgFinal)}>{calculated.avgFinal}%</div>
          <div className={`completion-banner ${completionTone}`}>
            <strong>{completionLabel}</strong>
            <small>{completion}% gotowe</small>
          </div>
          <button className="primary-btn wide" onClick={submit} disabled={!canCreateRole(user.role)} type="button">
            <Save size={16} /> Dodaj karte
          </button>
          <button className="ghost-btn wide" onClick={() => update(createDraft(draft.type))} type="button">
            <Trash2 size={16} /> Wyczysc szkic
          </button>
          <p className="hint-text">{notice || draftSaveState}</p>
        </section>

        <section className="rail-card">
          <div className="section-title">
            <span>Kompletnosc</span>
            <small>co brakuje do zapisu</small>
          </div>
          {missingItems.length ? (
            <div className="completion-list">
              {missingItems.map((item) => (
                <div className="completion-list-item" key={item}>
                  <CheckCircle2 size={15} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="completion-ok">
              <CheckCircle2 size={16} />
              <div>
                <strong>Wszystko gotowe</strong>
                <span>Karta ma komplet podstawowych danych i moze zostac zapisana.</span>
              </div>
            </div>
          )}
        </section>

        {!focusMode ? (
          <details className="rail-details">
            <summary>
              <span>Więcej</span>
              <small>kontrola jakości i kontekst</small>
            </summary>
            <section className="rail-card assistant-card">
              <div className="section-title">
                <span>Asystent oceny</span>
                <small>kontrola jakosci i podsumowanie</small>
              </div>
              <div className="assistant-actions">
                <button className="ghost-btn wide" type="button" onClick={runDraftGuard}>
                  <ShieldCheck size={16} /> Sprawdz karte
                </button>
                <button className="ghost-btn wide" type="button" onClick={generateSummary}>
                  <FileText size={16} /> Wygeneruj podsumowanie
                </button>
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
              ) : <p className="hint-text">Uzyj kontroli jakosci przed zapisem albo wygeneruj pierwsza wersje komentarza koncowego.</p>}
            </section>

            <section className="rail-card">
              <div className="section-title">
                <span>Kontekst</span>
                <small>{draft.specialist || 'Brak specjalisty'}</small>
              </div>
              <p className="hint-text">Panel po prawej zbiera wynik, gotowosc i pomocnicze akcje. W trybie skupienia pokazuje tylko to, co potrzebne do zapisu.</p>
            </section>
          </details>
        ) : null}
      </aside>
    </main>
  )
}
