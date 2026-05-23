import { useMemo, useState } from 'react'
import { Download, FileText, Save, Search, ShieldCheck, Upload, X } from 'lucide-react'
import { ASSESSMENT_DEFS, SCORE_OPTIONS } from '../../domain/defs'
import { assessmentToDraft, calculateDraft, draftToAssessment, periodOf } from '../../domain/scoring'
import { canEditAssessment as canEditAssessmentForUser } from '../../lib/security'
import type { Assessment, AssessmentStatus, AssessmentType, ScoreValue, UserProfile } from '../../domain/types'
import { uniqueSorted } from '../analytics/filters'
import { AssessmentTable } from './AssessmentTable'
import { exportCsv, exportExcel, exportJson, printAssessment, statusLabels } from './registryExports'

function scoreClass(score: number): string {
  if (score >= 92) return 'score score-great'
  if (score >= 82) return 'score score-good'
  return 'score score-below'
}

function readableError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error.trim()) return error
  return fallback
}

function countFilledNotes(notes: Assessment['snapshotNotes']): number {
  return Object.values(notes || {}).reduce((sum, items) => sum + items.filter((item) => item.trim()).length, 0)
}

function countNonDefaultScores(scores: Assessment['snapshotScores']): number {
  return Object.values(scores || {}).reduce((sum, rows) => (
    sum + rows.reduce((rowSum, row) => rowSum + row.filter((value) => value !== 1).length, 0)
  ), 0)
}

function summarizeAssessmentChanges(previous: Assessment, next: Assessment): string[] {
  const changes: string[] = []
  if (previous.spec !== next.spec) changes.push(`specjalista: ${previous.spec || '-'} -> ${next.spec || '-'}`)
  if (previous.stand !== next.stand) changes.push(`stanowisko: ${previous.stand || '-'} -> ${next.stand || '-'}`)
  if (previous.dzial !== next.dzial) changes.push(`dział: ${previous.dzial || '-'} -> ${next.dzial || '-'}`)
  if (previous.data !== next.data) changes.push(`data oceny: ${previous.data} -> ${next.data}`)
  if ((previous.notes || '') !== (next.notes || '')) changes.push('zaktualizowano podsumowanie końcowe')
  if ((previous.goldDesc || '') !== (next.goldDesc || '')) changes.push('zaktualizowano opis złotych punktów')
  if (previous.avgFinal !== next.avgFinal) changes.push(`wynik końcowy: ${previous.avgFinal}% -> ${next.avgFinal}%`)
  if (previous.contactCount !== next.contactCount) changes.push(`liczba kontaktów: ${previous.contactCount} -> ${next.contactCount}`)
  if (JSON.stringify(previous.ids) !== JSON.stringify(next.ids)) changes.push('zmieniono identyfikatory kontaktów')
  if (JSON.stringify(previous.gold) !== JSON.stringify(next.gold)) changes.push('zmieniono złote punkty')
  const scoreDelta = Math.abs(countNonDefaultScores(next.snapshotScores) - countNonDefaultScores(previous.snapshotScores))
  const noteDelta = Math.abs(countFilledNotes(next.snapshotNotes) - countFilledNotes(previous.snapshotNotes))
  if (JSON.stringify(previous.snapshotScores) !== JSON.stringify(next.snapshotScores)) changes.push(`zaktualizowano scoring (${scoreDelta || 'wiele'} pól)`)
  if (JSON.stringify(previous.snapshotNotes) !== JSON.stringify(next.snapshotNotes)) changes.push(`zaktualizowano uwagi sekcyjne (${noteDelta || 'wiele'} pól)`)
  return changes
}

function latestEvent(assessment: Assessment) {
  const history = assessment.statusHistory || []
  return history[history.length - 1]
}

function isRecentlyUpdated(assessment: Assessment, hours = 72): boolean {
  const event = latestEvent(assessment)
  if (!event?.at) return false
  const diff = Date.now() - new Date(event.at).getTime()
  return diff >= 0 && diff <= hours * 60 * 60 * 1000
}

function hasEditHistory(assessment: Assessment): boolean {
  return (assessment.statusHistory || []).some((item) => item.note.toLowerCase().includes('edytowano kart'))
}

function canCreate(user: UserProfile): boolean {
  return ['admin', 'director', 'leader', 'assessor'].includes(user.role)
}

function AssessmentPreviewModal({
  assessment,
  onClose,
  onPrint,
}: {
  assessment: Assessment
  onClose: () => void
  onPrint: (assessment: Assessment) => void
}) {
  const def = ASSESSMENT_DEFS[assessment.type]
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="modal-card preview-modal">
        <header className="modal-header">
          <div>
            <h3>{def.name}</h3>
            <p>{assessment.spec} • {assessment.period} • {statusLabels[assessment.status]}</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="preview-grid">
          <div><span>Stanowisko</span><strong>{assessment.stand || '-'}</strong></div>
          <div><span>Dział</span><strong>{assessment.dzial || '-'}</strong></div>
          <div><span>Oceniający</span><strong>{assessment.oce || '-'}</strong></div>
          <div><span>Data</span><strong>{assessment.data}</strong></div>
          <div><span>Wynik</span><strong className={scoreClass(assessment.avgFinal)}>{assessment.avgFinal}%</strong></div>
        </div>
        <div className="preview-meta-grid">
          <section>
            <h4>Podsumowanie oceny</h4>
            <p>{assessment.notes || 'Brak opisu końcowego dla tej karty.'}</p>
          </section>
          <section>
            <h4>Zakres materiału</h4>
            <div className="preview-pill-row">
              {assessment.ids.length ? assessment.ids.map((item) => <span key={item}>{item}</span>) : <span>Brak identyfikatorów kontaktu</span>}
            </div>
            <small>{assessment.goldDesc || 'Bez dodatkowych złotych punktów.'}</small>
          </section>
        </div>
        <div className="preview-sections">
          {def.sections.map((section) => (
            <section key={section.key}>
              <h4>{section.label}</h4>
              {section.criteria.map((criterion, criterionIndex) => (
                <div className="preview-row" key={criterion.name}>
                  <span>{criterion.name}</span>
                  <div>
                    {Array.from({ length: assessment.contactCount }, (_, contactIndex) => {
                      const value = assessment.snapshotScores[section.key]?.[criterionIndex]?.[contactIndex] ?? 1
                      return <strong key={contactIndex}>{value === 'nd' ? 'N/D' : value}</strong>
                    })}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
        <div className="status-timeline">
          <h4>Historia statusu</h4>
          {(assessment.statusHistory || []).length ? assessment.statusHistory.map((item, index) => (
            <div className="timeline-item" key={`${item.status}-${item.at}-${index}`}>
              <strong>{statusLabels[item.status]}</strong>
              <span>{new Date(item.at).toLocaleString('pl-PL')} • {item.by || 'system'}</span>
              <small>{item.note}</small>
            </div>
          )) : <p className="hint-text">Brak zapisanej historii statusów dla tej karty.</p>}
        </div>
        <footer className="modal-footer">
          <button className="ghost-btn" type="button" onClick={() => onPrint(assessment)}><FileText size={16} /> Drukuj / PDF</button>
          <button className="primary-btn" type="button" onClick={onClose}>Zamknij</button>
        </footer>
      </section>
    </div>
  )
}

function AssessmentEditModal({
  assessment,
  user,
  onClose,
  onSave,
}: {
  assessment: Assessment
  user: UserProfile
  onClose: () => void
  onSave: (assessment: Assessment) => Promise<void>
}) {
  const [draft, setDraft] = useState(() => assessmentToDraft(assessment))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [changeReason, setChangeReason] = useState('')
  const def = ASSESSMENT_DEFS[draft.type]
  const calculated = useMemo(() => calculateDraft(draft), [draft])
  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(assessmentToDraft(assessment)), [assessment, draft])

  function setScore(sectionKey: string, criterionIndex: number, contactIndex: number, value: ScoreValue) {
    const scores = structuredClone(draft.scores)
    scores[sectionKey][criterionIndex][contactIndex] = value
    setDraft({ ...draft, scores })
  }

  function setSectionNote(sectionKey: string, contactIndex: number, value: string) {
    const notes = structuredClone(draft.notes)
    notes[sectionKey][contactIndex] = value
    setDraft({ ...draft, notes })
  }

  async function save() {
    if (!isDirty) {
      setError('Brak zmian do zapisania.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const recalculated = draftToAssessment(draft, assessment.leaderScope || draft.assessor)
      const diffSummary = summarizeAssessmentChanges(assessment, recalculated)
      const historyPrefix = assessment.oce === (user.fullName || user.email)
        ? 'Edytowano kartę przez oceniającego'
        : 'Edytowano kartę przez osobę z uprawnieniami'
      const historyParts = [historyPrefix]
      if (changeReason.trim()) historyParts.push(`Powód: ${changeReason.trim()}`)
      if (diffSummary.length) historyParts.push(`Zakres: ${diffSummary.join('; ')}`)
      await onSave({
        ...recalculated,
        id: assessment.id,
        status: assessment.status,
        statusHistory: [
          ...(assessment.statusHistory || []),
          {
            status: assessment.status,
            at: new Date().toISOString(),
            by: user.fullName || user.email,
            note: historyParts.join('. '),
          },
        ],
        createdAt: assessment.createdAt,
        leaderScope: assessment.leaderScope,
      })
      onClose()
    } catch (err) {
      setError(readableError(err, 'Nie udało się zapisać zmian w karcie.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="modal-card edit-modal">
        <header className="modal-header">
          <div>
            <h3>Edytuj kartę</h3>
            <p>{assessment.spec} • wynik po zmianach {calculated.avgFinal}%</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </header>
        {error ? <div className="error-box modal-error">{error}</div> : null}
        <div className="field-grid two">
          <label><span>Specjalista</span><input value={draft.specialist} onChange={(event) => setDraft({ ...draft, specialist: event.target.value })} /></label>
          <label><span>Data</span><input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value, period: periodOf(event.target.value) })} /></label>
          <label><span>Stanowisko</span><input value={draft.position} onChange={(event) => setDraft({ ...draft, position: event.target.value })} /></label>
          <label><span>Dział</span><input value={draft.department} onChange={(event) => setDraft({ ...draft, department: event.target.value })} /></label>
        </div>
        <div className="edit-contact-grid" style={{ gridTemplateColumns: `repeat(${draft.contactCount}, minmax(0, 1fr))` }}>
          {draft.contactIds.map((contactId, index) => (
            <label key={index}>
              <span>{def.contactLabel} {index + 1}</span>
              <input
                value={contactId}
                onChange={(event) => {
                  const contactIds = [...draft.contactIds]
                  contactIds[index] = event.target.value
                  setDraft({ ...draft, contactIds })
                }}
              />
            </label>
          ))}
        </div>
        <div className="edit-sections">
          {def.sections.map((section) => (
            <section key={section.key}>
              <h4>{section.label}</h4>
              {section.criteria.map((criterion, criterionIndex) => (
                <div className="edit-row" key={criterion.name}>
                  <span>{criterion.name}</span>
                  {Array.from({ length: draft.contactCount }, (_, contactIndex) => {
                    const current = draft.scores[section.key]?.[criterionIndex]?.[contactIndex] ?? 1
                    return (
                      <div className="score-buttons" key={contactIndex}>
                        {SCORE_OPTIONS.map((option) => (
                          <button
                            key={option.label}
                            className={current === option.value ? 'selected' : ''}
                            onClick={() => setScore(section.key, criterionIndex, contactIndex, option.value)}
                            type="button"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )
                  })}
                </div>
              ))}
              <div className="edit-note-grid" style={{ gridTemplateColumns: `repeat(${draft.contactCount}, minmax(0, 1fr))` }}>
                {Array.from({ length: draft.contactCount }, (_, contactIndex) => (
                  <label key={contactIndex}>
                    <span>Uwagi {def.contactLabel.toLowerCase()} {contactIndex + 1}</span>
                    <textarea
                      value={draft.notes[section.key]?.[contactIndex] || ''}
                      onChange={(event) => setSectionNote(section.key, contactIndex, event.target.value)}
                    />
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="edit-gold-panel">
          <div className="gold-row">
            {draft.gold.map((value, index) => (
              <select
                key={index}
                value={value}
                onChange={(event) => {
                  const gold = [...draft.gold]
                  gold[index] = Number(event.target.value)
                  setDraft({ ...draft, gold })
                }}
              >
                <option value={0}>{def.contactLabel} {index + 1}: 0</option>
                <option value={0.5}>{def.contactLabel} {index + 1}: +0,5</option>
                <option value={1}>{def.contactLabel} {index + 1}: +1</option>
              </select>
            ))}
          </div>
          <label>
            <span>Opis złotych punktów</span>
            <textarea value={draft.goldDescription} onChange={(event) => setDraft({ ...draft, goldDescription: event.target.value })} />
          </label>
        </div>
        <label className="summary-editor">
          <span>Podsumowanie</span>
          <textarea value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} />
        </label>
        <label className="summary-editor">
          <span>Powód zmiany / notatka audytowa</span>
          <textarea value={changeReason} onChange={(event) => setChangeReason(event.target.value)} placeholder="Np. korekta scoringu po odwołaniu lub uzupełnienie identyfikatorów..." />
        </label>
        <footer className="modal-footer">
          <button className="ghost-btn" type="button" onClick={onClose}>Anuluj</button>
          <button className="primary-btn" type="button" disabled={busy || !isDirty} onClick={save}><Save size={16} /> Zapisz zmiany</button>
        </footer>
      </section>
    </div>
  )
}

export default function RegistryView({
  assessments,
  user,
  onUpdate,
  onBulkImport,
}: {
  assessments: Assessment[]
  user: UserProfile
  onUpdate: (assessment: Assessment) => Promise<void>
  onBulkImport: (assessments: Assessment[]) => Promise<void>
}) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState<AssessmentType | 'all'>('all')
  const [status, setStatus] = useState<AssessmentStatus | 'all'>('all')
  const [period, setPeriod] = useState('all')
  const [changeFilter, setChangeFilter] = useState<'all' | 'recent' | 'edited' | 'decision'>('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selected, setSelected] = useState<Assessment | null>(null)
  const [editing, setEditing] = useState<Assessment | null>(null)
  const [notice, setNotice] = useState('')
  const canMutate = canCreate(user)
  const canAdvanceStatuses = user.role === 'admin' || user.role === 'director' || user.role === 'leader'
  const rows = useMemo(() => assessments.filter((item) => {
    const matchesQuery = `${item.spec} ${item.dzial} ${item.oce}`.toLowerCase().includes(query.toLowerCase())
    const matchesChangeFilter =
      changeFilter === 'all'
      || (changeFilter === 'recent' && isRecentlyUpdated(item))
      || (changeFilter === 'edited' && hasEditHistory(item))
      || (changeFilter === 'decision' && (item.status === 'submitted' || item.status === 'review'))
    return matchesQuery
      && (type === 'all' || item.type === type)
      && (status === 'all' || item.status === status)
      && (period === 'all' || item.period === period)
      && matchesChangeFilter
  }), [assessments, changeFilter, period, query, status, type])
  const periods = useMemo(() => uniqueSorted(assessments.map((item) => item.period)), [assessments])
  const editedCount = useMemo(() => assessments.filter(hasEditHistory).length, [assessments])
  const recentCount = useMemo(() => assessments.filter((item) => isRecentlyUpdated(item)).length, [assessments])
  const decisionCount = useMemo(() => assessments.filter((item) => item.status === 'submitted' || item.status === 'review').length, [assessments])
  const decisionQueue = useMemo(() => rows.filter((item) => item.status === 'submitted' || item.status === 'review').slice(0, 5), [rows])
  const visibleSelectedIds = useMemo(() => selectedIds.filter((id) => rows.some((item) => item.id === id)), [rows, selectedIds])
  const selectedRows = useMemo(() => rows.filter((item) => visibleSelectedIds.includes(item.id)), [rows, visibleSelectedIds])
  const allVisibleSelected = rows.length > 0 && rows.every((item) => visibleSelectedIds.includes(item.id))

  function canEditRow(item: Assessment) {
    return canEditAssessmentForUser(user, item)
  }

  function canAdvanceRow(item: Assessment) {
    return canAdvanceStatuses && (user.role !== 'leader' || item.leaderScope === user.leaderScope)
  }

  const selectedAdvanceable = selectedRows.filter(canAdvanceRow)

  function toggleSelect(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function toggleSelectAllVisible() {
    setSelectedIds((current) => {
      if (allVisibleSelected) return current.filter((id) => !rows.some((item) => item.id === id))
      return [...new Set([...current, ...rows.map((item) => item.id)])]
    })
  }

  async function advance(item: Assessment) {
    if (!canAdvanceRow(item)) {
      setNotice('Ta rola nie może zmieniać statusu tej karty.')
      return
    }
    const next: Record<AssessmentStatus, AssessmentStatus> = {
      submitted: 'review',
      review: 'approved',
      approved: 'archived',
      archived: 'submitted',
    }
    const nextStatus = next[item.status]
    try {
      await onUpdate({
        ...item,
        status: nextStatus,
        statusHistory: [
          ...(item.statusHistory || []),
          {
            status: nextStatus,
            at: new Date().toISOString(),
            by: user.fullName || user.email,
            note: `Zmiana statusu z ewidencji: ${statusLabels[item.status]} -> ${statusLabels[nextStatus]}`,
          },
        ],
      })
      setNotice(`Status zmieniony na: ${statusLabels[nextStatus]}.`)
    } catch (error) {
      setNotice(readableError(error, 'Nie udało się zmienić statusu.'))
    }
  }

  async function advanceSelected() {
    if (!selectedAdvanceable.length) {
      setNotice('Zaznacz co najmniej jedną kartę możliwą do przesunięcia.')
      return
    }
    const next: Record<AssessmentStatus, AssessmentStatus> = {
      submitted: 'review',
      review: 'approved',
      approved: 'archived',
      archived: 'submitted',
    }
    try {
      await Promise.all(selectedAdvanceable.map((item) => onUpdate({
        ...item,
        status: next[item.status],
        statusHistory: [
          ...(item.statusHistory || []),
          {
            status: next[item.status],
            at: new Date().toISOString(),
            by: user.fullName || user.email,
            note: `Masowa zmiana statusu z ewidencji: ${statusLabels[item.status]} -> ${statusLabels[next[item.status]]}`,
          },
        ],
      })))
      setSelectedIds([])
      setNotice(`Przesunięto ${selectedAdvanceable.length} kart.`)
    } catch (error) {
      setNotice(readableError(error, 'Nie udało się wykonać masowej zmiany statusu.'))
    }
  }

  function openEditor(item: Assessment) {
    if (!canEditRow(item)) {
      setNotice('Nie masz uprawnień do edycji tej karty.')
      return
    }
    setEditing(item)
  }

  async function importJson(file: File | undefined) {
    if (!file) return
    if (!canMutate) {
      setNotice('Import jest zablokowany dla roli podglądu.')
      return
    }
    setNotice('')
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as Assessment[]
      if (!Array.isArray(parsed)) throw new Error('Plik JSON musi zawierać tablicę kart.')
      const valid = parsed.filter((item) => item && item.id && item.type && item.spec && item.snapshotScores)
      if (!valid.length) throw new Error('Nie znaleziono poprawnych kart do importu.')
      await onBulkImport(valid)
      setNotice(`Zaimportowano ${valid.length} kart.`)
    } catch (error) {
      setNotice(readableError(error, 'Import nie powiódł się.'))
    }
  }

  async function exportRows(kind: 'csv' | 'excel' | 'json') {
    try {
      if (kind === 'csv') exportCsv(rows)
      if (kind === 'excel') await exportExcel(rows)
      if (kind === 'json') exportJson(rows)
      setNotice(`Eksport ${kind.toUpperCase()} przygotowany dla ${rows.length} pozycji.`)
    } catch (error) {
      setNotice(readableError(error, 'Nie udało się przygotować eksportu.'))
    }
  }

  function printRow(item: Assessment) {
    if (!printAssessment(item)) setNotice('Przeglądarka zablokowała nowe okno drukowania/PDF.')
  }

  return (
    <main className="screen">
      <section className="toolbar-panel">
        <label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Szukaj specjalisty, działu lub oceniającego" /></label>
        <select value={type} onChange={(event) => setType(event.target.value as AssessmentType | 'all')}>
          <option value="all">Wszystkie typy</option>
          <option value="r">Rozmowy</option>
          <option value="m">Maile</option>
          <option value="s">Systemy</option>
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value as AssessmentStatus | 'all')}>
          <option value="all">Wszystkie statusy</option>
          {(Object.keys(statusLabels) as AssessmentStatus[]).map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}
        </select>
        <select value={period} onChange={(event) => setPeriod(event.target.value)}>
          <option value="all">Wszystkie okresy</option>
          {periods.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={changeFilter} onChange={(event) => setChangeFilter(event.target.value as 'all' | 'recent' | 'edited' | 'decision')}>
          <option value="all">Wszystkie zmiany</option>
          <option value="recent">Aktywność 72h</option>
          <option value="edited">Tylko edytowane</option>
          <option value="decision">Do decyzji</option>
        </select>
        <button className="ghost-btn" type="button" onClick={() => void exportRows('csv')}><Download size={16} /> CSV</button>
        <button className="ghost-btn" type="button" onClick={() => void exportRows('excel')}><Download size={16} /> Excel</button>
        <button className="ghost-btn" type="button" onClick={() => void exportRows('json')}><Download size={16} /> JSON</button>
        <label className="ghost-btn import-btn">
          <Upload size={16} /> Import JSON
          <input disabled={!canMutate} type="file" accept="application/json,.json" onChange={(event) => void importJson(event.target.files?.[0])} />
        </label>
      </section>
      <section className="registry-summary">
        <div className="status-chip">Wynik filtra: {rows.length}</div>
        <div className="status-chip">Edytowane karty: {editedCount}</div>
        <div className="status-chip">Aktywność 72h: {recentCount}</div>
        <div className="status-chip">Do decyzji: {decisionCount}</div>
      </section>
      <section className="data-panel">
        <div className="section-title"><span>Kolejka decyzji</span><small>najbliższe karty do przejrzenia</small></div>
        <div className="registry-queue-head">
          <div className="quick-filter-group">
            <button className={changeFilter === 'decision' ? 'active' : ''} type="button" onClick={() => setChangeFilter('decision')}>Pokaż do decyzji</button>
            <button className={changeFilter === 'recent' ? 'active' : ''} type="button" onClick={() => setChangeFilter('recent')}>Ostatnie 72h</button>
            <button className={changeFilter === 'edited' ? 'active' : ''} type="button" onClick={() => setChangeFilter('edited')}>Edytowane</button>
            <button className={changeFilter === 'all' ? 'active' : ''} type="button" onClick={() => setChangeFilter('all')}>Wszystkie</button>
          </div>
          {canAdvanceStatuses ? (
            <div className="bulk-actions">
              <span>{visibleSelectedIds.length} zaznaczonych</span>
              <button className="ghost-btn" disabled={!rows.length} type="button" onClick={toggleSelectAllVisible}>Zaznacz widoczne</button>
              <button className="ghost-btn" disabled={!visibleSelectedIds.length} type="button" onClick={() => setSelectedIds((current) => current.filter((id) => !visibleSelectedIds.includes(id)))}>Wyczyść wybór</button>
              <button className="primary-btn" disabled={!selectedAdvanceable.length} type="button" onClick={() => void advanceSelected()}><ShieldCheck size={15} /> Przesuń status</button>
            </div>
          ) : null}
        </div>
        {decisionQueue.length ? (
          <div className="queue-grid">
            {decisionQueue.map((item) => (
              <button className="queue-card" key={item.id} type="button" onClick={() => setSelected(item)}>
                <strong>{item.spec}</strong>
                <span>{statusLabels[item.status]} • {item.period}</span>
                <small>{item.avgFinal}% • {item.oce || 'brak oceniającego'}</small>
              </button>
            ))}
          </div>
        ) : <div className="empty-state compact-empty">Brak kart w kolejce decyzji dla aktualnego filtra.</div>}
      </section>
      <section className="data-panel">
        <div className="section-title"><span>Ewidencja kart</span><small>{notice || `${rows.length} pozycji`}</small></div>
        <AssessmentTable
          assessments={rows}
          onPreview={setSelected}
          onPrint={printRow}
          onEdit={canMutate ? openEditor : undefined}
          canEditItem={canEditRow}
          onAdvance={canAdvanceStatuses ? (item) => void advance(item) : undefined}
          canAdvanceItem={canAdvanceRow}
          selectable={canAdvanceStatuses}
          selectedIds={visibleSelectedIds}
          allVisibleSelected={allVisibleSelected}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAllVisible}
        />
        <div className="row-action-strip">
          {canAdvanceStatuses ? rows.filter(canAdvanceRow).slice(0, 6).map((item) => (
            <button key={item.id} className="ghost-btn" type="button" onClick={() => advance(item)}>
              {item.spec}: {statusLabels[item.status]} {'->'}
            </button>
          )) : <span className="hint-text">Tryb tylko do odczytu: podgląd i eksporty pozostają dostępne.</span>}
        </div>
      </section>
      {selected ? <AssessmentPreviewModal assessment={selected} onClose={() => setSelected(null)} onPrint={printRow} /> : null}
      {editing ? <AssessmentEditModal assessment={editing} user={user} onClose={() => setEditing(null)} onSave={onUpdate} /> : null}
    </main>
  )
}
