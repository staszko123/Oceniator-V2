import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Mail, MonitorCog, PhoneCall, Save, Trash2 } from 'lucide-react'
import { canCompareLeadersRole, canCreateRole } from '../../domain/access'
import { getErrorMessage } from '../../domain/errors'
import { ASSESSMENT_DEFS, SCORE_OPTIONS, TYPE_LABELS } from '../../domain/defs'
import { calculateDraft, createDraft, periodOf, ratingLabel, resizeDraft } from '../../domain/scoring'
import { validateAssessmentDraft } from '../../domain/draftValidation'
import type { AdminConfig, AssessmentDraft, AssessmentType, ScoreValue, UserProfile } from '../../domain/types'
import { scoreClass } from '../../lib/display'
import { useLanguage } from '../../i18n/LanguageContext'

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
  saveStatus,
  onRetrySave,
  specialistPrefillName,
  specialistPrefillToken,
  onSelectType,
  onDraftChange,
  onSaveAssessment,
}: {
  user: UserProfile
  admin: AdminConfig
  draft: AssessmentDraft
  saveStatus?: string
  onRetrySave?: () => void
  specialistPrefillName?: string
  specialistPrefillToken?: number
  onSelectType: (type: AssessmentType) => void
  onDraftChange: (draft: AssessmentDraft) => void
  onSaveAssessment: (draft: AssessmentDraft) => Promise<void>
}) {
  const { t } = useLanguage()
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const submitting = useRef(false)
  const [validationTouched, setValidationTouched] = useState(false)
  const lastPrefillToken = useRef<number | null>(null)
  const def = ASSESSMENT_DEFS[draft.type]
  const calculated = useMemo(() => calculateDraft(draft), [draft])
  const validation = useMemo(() => validateAssessmentDraft(draft), [draft])
  const specialists = useMemo(() => {
    if (canCompareLeadersRole(user.role)) return admin.specialists.filter((item) => item.active)
    return admin.specialists.filter((item) => item.active && item.leader === user.leaderScope)
  }, [admin.specialists, user])
  const draftSaveState = saveStatus || (draft.savedAt
    ? `${t('evaluation.draftSaved', 'Szkic zapisany o')} ${new Date(draft.savedAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`
    : 'Szkic jeszcze niezapisany')
  const filledIds = draft.contactIds.filter((item) => item.trim()).length
  const lowScoreCount = Object.values(draft.scores).reduce((sum, rows) => sum + rows.reduce((rowSum, row) => rowSum + row.filter((value) => value === 0 || value === 0.5).length, 0), 0)
  const completionPoints = [
    draft.specialist.trim() ? 1 : 0,
    draft.date ? 1 : 0,
    filledIds > 0 ? 1 : 0,
    draft.summary.trim() ? 1 : 0,
    validation.valid ? 1 : 0,
  ]
  const completion = Math.round(completionPoints.reduce((acc, value) => acc + value, 0) / completionPoints.length * 100)
  const completionLabel = validation.valid
    ? t('evaluation.readyToSave', 'Karta jest gotowa do zapisu')
    : `${t('evaluation.missingToSave', 'Brakuje {count} elementów do zapisu').replace('{count}', String(validation.issues.length))}`
  const completionTone = validation.valid ? 'ok' : 'warning'

  useEffect(() => {
    if (!specialistPrefillName || !specialistPrefillToken) return
    if (lastPrefillToken.current === specialistPrefillToken) return
    lastPrefillToken.current = specialistPrefillToken
    if (!canAutofillSpecialist(draft)) return
    const person = specialists.find((item) => item.name === specialistPrefillName)
    onDraftChange({
      ...draft,
      specialist: specialistPrefillName,
      position: person?.position || '',
      department: person?.department || '',
      assessor: draft.assessor || user.fullName || user.email,
    })
  }, [draft, onDraftChange, specialistPrefillName, specialistPrefillToken, specialists, user])

  function update(next: AssessmentDraft) {
    if (submitting.current) return
    if (notice) setNotice('')
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
      position: person?.position || '',
      department: person?.department || '',
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

  async function submit() {
    if (submitting.current) return
    setValidationTouched(true)
    if (!validation.valid) {
      setNotice(validation.issues.map((issue) => issue.label).join(' '))
      return
    }
    submitting.current = true
    setSaving(true)
    try {
      await onSaveAssessment({
        ...draft,
        assessor: draft.assessor || user.fullName || user.email,
      })
      setNotice(t('evaluation.addedToRegistry', 'Karta dodana do ewidencji.'))
      setValidationTouched(false)
    } catch (error) {
      setNotice(getErrorMessage(error, t('evaluation.saveError', 'Nie udało się zapisać karty.')))
    } finally {
      submitting.current = false
      setSaving(false)
    }
  }

  return (
    <main className="screen form-screen evaluation-screen">
      <section className="form-main">
        <div className="form-toolbar">
          <div className="section-title">
            <span>{t('evaluation.title', 'Panel Oceny')}</span>
            <small>{draftSaveState}</small>
          </div>
          <div className="form-toolbar-actions">
            <div className="type-tabs">
              {(Object.keys(ASSESSMENT_DEFS) as AssessmentType[]).map((item) => (
                <button
                  key={item}
                  disabled={saving}
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
          </div>
        </div>


        {validationTouched && !validation.valid ? (
          <section className="validation-panel">
            <strong>{t('evaluation.requiredData', 'Uzupełnij wymagane dane przed zapisem')}</strong>
            <div className="completion-list">
              {validation.issues.map((issue) => (
                <button type="button" className="completion-list-item" key={issue.key} onClick={() => {
                  const section = ['specialist', 'date', 'position', 'department'].includes(issue.key) ? 'data' : issue.key === 'contactIds' ? 'contacts' : issue.key === 'summary' ? 'summary' : 'criteria'
                  const target = document.getElementById(`section-${section}`)
                  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  target?.querySelector<HTMLElement>('input, textarea, button')?.focus({ preventScroll: true })
                }}>
                  <CheckCircle2 size={15} />
                  <span>{issue.label}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="form-card meta-card step-card" id="section-data">
          <header className="step-header">
            <div>
              <span className="step-index">1</span>
              <div>
                <h3>{t('evaluation.cardData', 'Dane oceny')}</h3>
                <p>{t('evaluation.cardDataDesc', 'Wybierz typ, specjalistę i podstawowe dane karty.')}</p>
              </div>
            </div>
            <small>{draftSaveState}</small>
          </header>
          <div className="field-grid">
            <label>
              <span>{t('table.specialist', 'Specjalista')}</span>
              <input list="specialists" value={draft.specialist} onChange={(event) => selectSpecialist(event.target.value)} placeholder={t('evaluation.specPlaceholder', 'Zacznij wpisywać...')} />
              <datalist id="specialists">
                {specialists.map((item) => <option key={item.id} value={item.name} />)}
              </datalist>
            </label>
            <label>
              <span>{t('evaluation.date', 'Data oceny')}</span>
              <input
                type="date"
                value={draft.date}
                onChange={(event) => update({ ...draft, date: event.target.value, period: periodOf(event.target.value) })}
              />
            </label>
            <div className="readonly-field">
              <span>{t('label.position', 'Stanowisko')}</span>
              <strong>{draft.position.trim() || t('evaluation.positionAuto', 'Wybrane automatycznie po wskazaniu specjalisty')}</strong>
              <small>{t('evaluation.positionHint', 'Tylko do podglądu. Uzupełnia się z profilu specjalisty.')}</small>
            </div>
            <div className="readonly-field">
              <span>{t('label.department', 'Dział')}</span>
              <strong>{draft.department.trim() || t('evaluation.departmentAuto', 'Wybrany automatycznie po wskazaniu specjalisty')}</strong>
              <small>{t('evaluation.departmentHint', 'Tylko do podglądu. Uzupełnia się z profilu specjalisty.')}</small>
            </div>
          </div>
        </section>

        <section className="form-card step-card" id="section-contacts">
          <header className="step-header">
            <div>
              <span className="step-index">2</span>
              <div>
                <h3>{t('evaluation.contacts', 'Kontakty lub sprawy')}</h3>
                <p>{t('evaluation.contactsDesc', 'Ustal liczbę kontaktów i wpisz identyfikatory do oceny.')}</p>
              </div>
            </div>
            <small>{filledIds} / {draft.contactCount}</small>
          </header>
          <div className="contact-strip">
            <div className="contact-stepper">
              <span>{t('evaluation.contactCount', 'Liczba {label}').replace('{label}', def.pluralLabel)}</span>
              <div className="contact-stepper-controls">
                <button type="button" onClick={() => setContactCount(draft.contactCount - 1)} aria-label={`${t('evaluation.decrease', 'Zmniejsz liczbę')} ${def.pluralLabel.toLowerCase()}`}>-</button>
                <strong>{draft.contactCount}</strong>
                <button type="button" onClick={() => setContactCount(draft.contactCount + 1)} aria-label={`${t('evaluation.increase', 'Zwiększ liczbę')} ${def.pluralLabel.toLowerCase()}`}>+</button>
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
                <h3>{t('evaluation.criteria', 'Ocena kryteriów')}</h3>
                <p>{t('evaluation.criteriaDesc', 'Wypełnij tabelę i dopisz uwagi przy obniżonych ocenach.')}</p>
              </div>
            </div>
            <small>{lowScoreCount} {t('evaluation.lowerScores', 'obniżonych ocen')}</small>
          </header>
          <p className="section-guide">
            {t('evaluation.criteriaHint', 'Wybieraj ocenę w tej samej kolumnie, w której znajduje się dany kontakt. Wiersz uwag służy do notatek pomocniczych do sekcji.')}
          </p>

          {def.sections.map((section) => (
            <section className="score-section" id={`section-${section.key}`} key={section.key}>
              <header>
                <h3>{section.label}</h3>
                <span>{t('evaluation.sectionWeight', 'waga')} {Math.round(section.weight * 100)}%</span>
              </header>
              <table className="score-table">
                <thead>
                  <tr>
                    <th scope="col">{t('evaluation.criterion', 'Kryterium')}</th>
                    {Array.from({ length: draft.contactCount }, (_, index) => <th scope="col" key={index}>{def.contactLabel} {index + 1}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {section.criteria.map((criterion, criterionIndex) => (
                    <tr key={criterion.name}>
                      <th scope="row">
                        <strong>{criterion.name}</strong>
                        <small>{criterion.hint}</small>
                      </th>
                      {Array.from({ length: draft.contactCount }, (_, contactIndex) => {
                        const current = draft.scores[section.key]?.[criterionIndex]?.[contactIndex] ?? 1
                        return (
                          <td key={contactIndex}>
                            <div className="score-buttons">
                              {SCORE_OPTIONS.map((option) => (
                                <button
                                  key={option.label}
                                  className={current === option.value ? 'selected' : ''}
                                  aria-label={`${criterion.name}, ${def.contactLabel} ${contactIndex + 1}, ${option.title}`}
                                  aria-pressed={current === option.value}
                                  onClick={() => setScore(section.key, criterionIndex, contactIndex, option.value)}
                                  title={`${criterion.name} · ${def.contactLabel} ${contactIndex + 1} · ${option.title}`}
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
                    <td>{t('evaluation.sectionNotes', 'Uwagi do sekcji')}</td>
                    {Array.from({ length: draft.contactCount }, (_, contactIndex) => (
                      <td key={contactIndex}>
                        <textarea
                          value={draft.notes[section.key]?.[contactIndex] ?? ''}
                          onChange={(event) => setSectionNote(section.key, contactIndex, event.target.value)}
                          placeholder={t('evaluation.sectionNotesPlaceholder', 'Uwagi...')}
                        />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </section>
          ))}

          <details className="subdetails gold-callout">
            <summary>
              <span>{t('evaluation.goldPoint', 'Złoty punkt')}</span>
              <small>{t('evaluation.goldPointSubtitle', 'bonus i uzasadnienie')}</small>
            </summary>
            <div className="gold-single-card">
              <div className="gold-single-head">
                <div>
                  <strong>{t('evaluation.goldPoint', 'Złoty punkt')}</strong>
                  <p>{t('evaluation.goldPointDesc', 'Wszystkie dane bonusu trzymaj w jednym miejscu, żeby zapis był prosty i czytelny.')}</p>
                </div>
                <span>{draft.gold.some((item) => item > 0) ? t('evaluation.goldComplete', 'Uzupełniony') : t('evaluation.goldMissing', 'Do uzupełnienia')}</span>
              </div>
              <div className="gold-list gold-section-body">
                {draft.gold.map((value, index) => (
                  <article className="gold-row-card" key={index}>
                    <div className="gold-row-head">
                      <strong>{def.contactLabel} {index + 1}</strong>
                      <span>{value > 0 ? `${t('evaluation.bonusLabel', 'Bonus')} +${String(value).replace('.', ',')}` : t('evaluation.noBonus', 'Bez bonusu')}</span>
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
                <span>{t('evaluation.goldReason', 'Uzasadnienie złotego punktu')}</span>
                <textarea
                  value={draft.goldDescription}
                  onChange={(event) => updateField('goldDescription', event.target.value)}
                  placeholder={t('evaluation.goldReasonPlaceholder', 'Opisz konkretne zachowanie, sytuację lub efekt, który uzasadnia bonus.')}
                />
              </label>
            </div>
          </details>
        </section>

        <section className="form-card step-card" id="section-summary">
          <header className="step-header">
            <div>
              <span className="step-index">4</span>
              <div>
                <h3>{t('evaluation.summary', 'Podsumowanie')}</h3>
                <p>{t('evaluation.summaryDesc', 'Sprawdź końcowy wynik, gotowość i krótki obraz karty.')}</p>
              </div>
            </div>
            <small>{completion}% {t('evaluation.ready', 'gotowe')}</small>
          </header>
          <div className="summary-grid">
            <article>
              <span>{t('evaluation.resultScore', 'Wynik końcowy')}</span>
              <strong>{calculated.avgFinal}%</strong>
              <small>{ratingLabel(calculated.rating)}</small>
            </article>
            <article>
              <span>{t('evaluation.completeness', 'Kompletność')}</span>
              <strong>{completion}%</strong>
              <small>{completionLabel}</small>
            </article>
            <article>
              <span>{t('evaluation.draft', 'Szkic')}</span>
              <strong>{draft.savedAt ? t('evaluation.saved', 'Zapisany') : t('evaluation.draftDraft', 'Roboczy')}</strong>
              <small>{draftSaveState}</small>
            </article>
          </div>
          <label className="summary-editor">
            <span>{t('evaluation.summary', 'Opis / podsumowanie')}</span>
            <textarea value={draft.summary} onChange={(event) => updateField('summary', event.target.value)} placeholder={t('evaluation.summaryPlaceholder', 'Wnioski i plan działania...')} />
          </label>
        </section>
      </section>

      <aside className="right-rail">
        <nav className="rail-card evaluation-steps" aria-label="Etapy oceny">
          {['Dane', 'Kontakty', 'Kryteria i uwagi', 'Podsumowanie'].map((label, index) => (
            <a key={label} href={`#section-${['data', 'contacts', 'criteria', 'summary'][index]}`} onClick={(event) => {
              event.preventDefault()
              document.getElementById(`section-${['data', 'contacts', 'criteria', 'summary'][index]}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}><span>{index + 1}</span>{label}</a>
          ))}
        </nav>
        <section className="rail-card result-card">
          <div className="section-title">
            <span>{t('evaluation.resultScore', 'Wynik końcowy')}</span>
            <small>{ratingLabel(calculated.rating)}</small>
          </div>
          <div className={scoreClass(calculated.avgFinal)}>{calculated.avgFinal}%</div>
          <div className={`completion-banner ${completionTone}`}>
            <strong>{completionLabel}</strong>
            <small>{completion}% {t('evaluation.ready', 'gotowe')}</small>
          </div>
          <button className="primary-btn wide" onClick={submit} disabled={saving || !canCreateRole(user.role)} type="button">
            <Save size={16} /> {saving ? 'Zapisywanie…' : t('evaluation.addCard', 'Dodaj kartę')}
          </button>
          <button className="ghost-btn wide" disabled={saving} onClick={() => { if (window.confirm('Usunąć zawartość bieżącego szkicu?')) update(createDraft(draft.type)) }} type="button">
            <Trash2 size={16} /> {t('evaluation.clearDraft', 'Wyczyść szkic')}
          </button>
          <p className="hint-text" role="status" aria-live="polite">{notice || draftSaveState}</p>
          {saveStatus?.startsWith('Nie zapisano') ? <button className="ghost-btn wide" type="button" onClick={onRetrySave}>Ponów zapis szkicu</button> : null}
        </section>

        <section className="rail-card">
          <div className="section-title">
            <span>{t('evaluation.missingTitle', 'Braki do zapisu')}</span>
            <small>{validation.issues.length ? `${validation.issues.length} ${t('evaluation.items', 'pozycji')}` : t('evaluation.ready', 'gotowe')}</small>
          </div>
          {validation.issues.length ? (
            <div className="completion-list">
              {validation.issues.map((issue) => (
                <button type="button" className="completion-list-item" key={issue.key} onClick={() => {
                  const section = ['specialist', 'date', 'position', 'department'].includes(issue.key) ? 'data' : issue.key === 'contactIds' ? 'contacts' : issue.key === 'summary' ? 'summary' : 'criteria'
                  const target = document.getElementById(`section-${section}`)
                  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  target?.querySelector<HTMLElement>('input, textarea, button')?.focus({ preventScroll: true })
                }}>
                  <CheckCircle2 size={15} />
                  <span>{issue.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="completion-ok">
              <CheckCircle2 size={16} />
              <div>
                <strong>{t('evaluation.everythingReady', 'Wszystko gotowe')}</strong>
                <span>{t('evaluation.canSave', 'Karta ma komplet podstawowych danych i może zostać zapisana.')}</span>
              </div>
            </div>
          )}
        </section>
      </aside>
    </main>
  )
}
