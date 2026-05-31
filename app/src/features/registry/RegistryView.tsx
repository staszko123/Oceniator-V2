import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, Save, Search, ShieldCheck, Upload, X } from 'lucide-react'
import { canAdvanceAssessmentStatus, canAdvanceAssessmentStatusRole, canCreateRole, isViewerRole } from '../../domain/access'
import { getErrorMessage } from '../../domain/errors'
import { recordDiagnostic } from '../../domain/diagnostics'
import { ASSESSMENT_DEFS, SCORE_OPTIONS } from '../../domain/defs'
import { hasEditHistory, lastStatusEvent } from '../../domain/history'
import { assessmentToDraft, calculateDraft, draftToAssessment, periodOf } from '../../domain/scoring'
import { canEditAssessment as canEditAssessmentForUser } from '../../lib/security'
import type { Assessment, AssessmentComment, AssessmentStatus, AssessmentType, ScoreValue, UserProfile } from '../../domain/types'
import { uniqueSorted } from '../analytics/filters'
import { AssessmentTable } from './AssessmentTable'
import { AssessmentDetailModal } from './AssessmentDetailModal'
import { exportCsv, exportExcel, exportJson, printAssessment, statusLabels } from './registryExports'
import { useLanguage } from '../../i18n/LanguageContext'

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
  if (previous.dzial !== next.dzial) changes.push(`dzial: ${previous.dzial || '-'} -> ${next.dzial || '-'}`)
  if (previous.data !== next.data) changes.push(`data oceny: ${previous.data} -> ${next.data}`)
  if ((previous.notes || '') !== (next.notes || '')) changes.push('zaktualizowano podsumowanie koncowe')
  if ((previous.goldDesc || '') !== (next.goldDesc || '')) changes.push('zaktualizowano opis zlotych punktow')
  if (previous.avgFinal !== next.avgFinal) changes.push(`wynik koncowy: ${previous.avgFinal}% -> ${next.avgFinal}%`)
  if (previous.contactCount !== next.contactCount) changes.push(`liczba kontaktow: ${previous.contactCount} -> ${next.contactCount}`)
  if (JSON.stringify(previous.ids) !== JSON.stringify(next.ids)) changes.push('zmieniono identyfikatory kontaktow')
  if (JSON.stringify(previous.gold) !== JSON.stringify(next.gold)) changes.push('zmieniono zlote punkty')
  const scoreDelta = Math.abs(countNonDefaultScores(next.snapshotScores) - countNonDefaultScores(previous.snapshotScores))
  const noteDelta = Math.abs(countFilledNotes(next.snapshotNotes) - countFilledNotes(previous.snapshotNotes))
  if (JSON.stringify(previous.snapshotScores) !== JSON.stringify(next.snapshotScores)) changes.push(`zaktualizowano scoring (${scoreDelta || 'wiele'} pol)`)
  if (JSON.stringify(previous.snapshotNotes) !== JSON.stringify(next.snapshotNotes)) changes.push(`zaktualizowano uwagi sekcyjne (${noteDelta || 'wiele'} pol)`)
  return changes
}

function isRecentlyUpdated(assessment: Assessment, hours = 72): boolean {
  const event = lastStatusEvent(assessment)
  if (!event?.at) return false
  const diff = Date.now() - new Date(event.at).getTime()
  return diff >= 0 && diff <= hours * 60 * 60 * 1000
}

function typeLabel(type: AssessmentType | 'all'): string {
  if (type === 'all') return 'Wszystkie typy'
  return ASSESSMENT_DEFS[type].name
}

function changeFilterLabel(filter: 'all' | 'recent' | 'edited' | 'decision'): string {
  if (filter === 'recent') return 'Aktywne 72h'
  if (filter === 'edited') return 'Tylko edytowane'
  if (filter === 'decision') return 'Do decyzji'
  return 'Wszystkie zmiany'
}

const registryStatusTransitions: Record<AssessmentStatus, AssessmentStatus> = {
  submitted: 'review',
  review: 'approved',
  approved: 'archived',
  archived: 'submitted',
}

function buildRegistryStatusHistoryNote(base: string, changeReason: string, diffSummary: string[]) {
  const parts = [base]
  if (changeReason.trim()) parts.push(`Powód: ${changeReason.trim()}`)
  if (diffSummary.length) parts.push(`Zakres: ${diffSummary.join('; ')}`)
  return parts.join('. ')
}

function appendRegistryStatusHistory(
  assessment: Assessment,
  nextStatus: AssessmentStatus,
  user: UserProfile,
  note: string,
) {
  return {
    ...assessment,
    status: nextStatus,
    statusHistory: [
      ...(assessment.statusHistory || []),
      {
        status: nextStatus,
        at: new Date().toISOString(),
        by: user.fullName || user.email,
        note,
      },
    ],
  }
}

function AssessmentPreviewModal({
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
  return (
    <AssessmentDetailModal
      assessment={assessment}
      user={user}
      onClose={onClose}
      onPrint={onPrint}
      onEdit={onEdit}
      onAdvance={onAdvance}
      comments={comments}
      commentsLoading={commentsLoading}
      onAddComment={onAddComment}
    />
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
        ? 'Edytowano karte przez oceniajacego'
        : 'Edytowano karte przez osobe z uprawnieniami'
      const historyParts = [historyPrefix]
      if (changeReason.trim()) historyParts.push(`Powod: ${changeReason.trim()}`)
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
      setError(getErrorMessage(err, 'Nie udalo sie zapisac zmian w karcie.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="modal-card edit-modal">
        <header className="modal-header">
          <div>
            <h3>Edytuj karte</h3>
            <p>{assessment.spec} • wynik po zmianach {calculated.avgFinal}%</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </header>
        {error ? <div className="error-box modal-error">{error}</div> : null}
        <div className="field-grid two">
          <label><span>Specjalista</span><input value={draft.specialist} onChange={(event) => setDraft({ ...draft, specialist: event.target.value })} /></label>
          <label><span>Data</span><input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value, period: periodOf(event.target.value) })} /></label>
          <label><span>Stanowisko</span><input value={draft.position} onChange={(event) => setDraft({ ...draft, position: event.target.value })} /></label>
          <label><span>Dzial</span><input value={draft.department} onChange={(event) => setDraft({ ...draft, department: event.target.value })} /></label>
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
        <section className="score-section edit-gold-panel">
          <header>
            <h3>IV. Zlote punkty</h3>
            <span>{draft.contactCount} {def.contactLabel.toLowerCase()}</span>
          </header>
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
                      onClick={() => {
                        const gold = [...draft.gold]
                        gold[index] = option
                        setDraft({ ...draft, gold })
                      }}
                    >
                      {option === 0 ? '0' : `+${String(option).replace('.', ',')}`}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <label className="summary-editor">
            <span>Opis zlotych punktow</span>
            <textarea value={draft.goldDescription} onChange={(event) => setDraft({ ...draft, goldDescription: event.target.value })} />
          </label>
        </section>
        <label className="summary-editor">
          <span>Podsumowanie</span>
          <textarea value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} />
        </label>
        <label className="summary-editor">
          <span>Powod zmiany / notatka audytowa</span>
          <textarea value={changeReason} onChange={(event) => setChangeReason(event.target.value)} placeholder="Np. korekta scoringu po odwolaniu lub uzupelnienie identyfikatorow..." />
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
  intentPreset,
  intentToken,
  focusAssessmentId,
  focusToken,
  onUpdate,
  onBulkImport,
  loadComments,
  addComment,
}: {
  assessments: Assessment[]
  user: UserProfile
  intentPreset?: 'all' | 'decision' | 'recent' | 'edited'
  intentToken?: number
  focusAssessmentId?: string
  focusToken?: number
  onUpdate: (assessment: Assessment) => Promise<void>
  onBulkImport: (assessments: Assessment[]) => Promise<void>
  loadComments?: (assessmentId: string) => Promise<AssessmentComment[]>
  addComment?: (assessmentId: string, body: string) => Promise<AssessmentComment>
}) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState<AssessmentType | 'all'>('all')
  const [leader, setLeader] = useState('all')
  const [specialist, setSpecialist] = useState('all')
  const [status, setStatus] = useState<AssessmentStatus | 'all'>('all')
  const [period, setPeriod] = useState('all')
  const [changeFilter, setChangeFilter] = useState<'all' | 'recent' | 'edited' | 'decision'>('all')
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selected, setSelected] = useState<Assessment | null>(null)
  const [selectedComments, setSelectedComments] = useState<AssessmentComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [editing, setEditing] = useState<Assessment | null>(null)
  const [notice, setNotice] = useState('')
  const lastIntentToken = useRef<number | null>(null)
  const { t } = useLanguage()
  const isViewer = isViewerRole(user.role)
  const canMutate = canCreateRole(user.role)
  const canAdvanceStatuses = canAdvanceAssessmentStatusRole(user.role)

  const rows = useMemo(() => assessments.filter((item) => {
    const matchesQuery = `${item.spec} ${item.dzial} ${item.oce}`.toLowerCase().includes(query.toLowerCase())
    const matchesChangeFilter =
      changeFilter === 'all'
      || (changeFilter === 'recent' && isRecentlyUpdated(item))
      || (changeFilter === 'edited' && hasEditHistory(item))
      || (changeFilter === 'decision' && (item.status === 'submitted' || item.status === 'review'))

    return matchesQuery
      && (type === 'all' || item.type === type)
      && (leader === 'all' || item.leaderScope === leader)
      && (specialist === 'all' || item.spec === specialist)
      && (status === 'all' || item.status === status)
      && (period === 'all' || item.period === period)
      && matchesChangeFilter
  }), [assessments, changeFilter, leader, period, query, specialist, status, type])

  const periods = useMemo(() => uniqueSorted(assessments.map((item) => item.period)), [assessments])
  const leaders = useMemo(() => uniqueSorted(assessments.map((item) => item.leaderScope)), [assessments])
  const specialists = useMemo(() => uniqueSorted(assessments.map((item) => item.spec)), [assessments])
  const editedCount = useMemo(() => assessments.filter(hasEditHistory).length, [assessments])
  const recentCount = useMemo(() => assessments.filter((item) => isRecentlyUpdated(item)).length, [assessments])
  const decisionCount = useMemo(() => assessments.filter((item) => item.status === 'submitted' || item.status === 'review').length, [assessments])
  const decisionQueue = useMemo(() => rows.filter((item) => item.status === 'submitted' || item.status === 'review').slice(0, 5), [rows])
  const visibleSelectedIds = useMemo(() => selectedIds.filter((id) => rows.some((item) => item.id === id)), [rows, selectedIds])
  const selectedRows = useMemo(() => rows.filter((item) => visibleSelectedIds.includes(item.id)), [rows, visibleSelectedIds])
  const allVisibleSelected = rows.length > 0 && rows.every((item) => visibleSelectedIds.includes(item.id))
  const selectedAdvanceable = selectedRows.filter((item) => canAdvanceStatuses && canAdvanceAssessmentStatus(user, item))
  const hasActiveFilters = query.trim() || type !== 'all' || leader !== 'all' || specialist !== 'all' || status !== 'all' || period !== 'all' || changeFilter !== 'all'
  const activeFilterChips = [
    query.trim() ? `Fraza: ${query.trim()}` : null,
    type !== 'all' ? `Typ: ${typeLabel(type)}` : null,
    leader !== 'all' ? `Lider: ${leader}` : null,
    !isViewer && specialist !== 'all' ? `Specjalista: ${specialist}` : null,
    status !== 'all' ? `Status: ${statusLabels[status]}` : null,
    period !== 'all' ? `Okres: ${period}` : null,
    !isViewer && changeFilter !== 'all' ? `Widok: ${changeFilterLabel(changeFilter)}` : null,
  ].filter((item): item is string => Boolean(item))

  useEffect(() => {
    if (!intentPreset || !intentToken) return
    if (lastIntentToken.current === intentToken) return
    lastIntentToken.current = intentToken
    applyPreset(intentPreset)
    setNotice(intentPreset === 'decision'
      ? t('registry.intentDecision', 'Otworzono ewidencję w widoku: Do decyzji.')
      : intentPreset === 'recent'
        ? t('registry.intentRecent', 'Otworzono ewidencję w widoku: Ostatnie 72 h.')
        : intentPreset === 'edited'
          ? t('registry.intentEdited', 'Otworzono ewidencję w widoku: Edytowane.')
          : t('registry.intentAll', 'Otworzono pełny widok ewidencji.'))
  }, [intentPreset, intentToken, t])

  useEffect(() => {
    if (!focusAssessmentId || !focusToken) return
    const match = assessments.find((item) => item.id === focusAssessmentId)
    if (!match) return
    const timer = window.setTimeout(() => setSelected(match), 0)
    return () => window.clearTimeout(timer)
  }, [assessments, focusAssessmentId, focusToken])

  useEffect(() => {
    if (!selected || !loadComments) return
    let cancelled = false
    void Promise.resolve().then(async () => {
      if (cancelled) return
      setCommentsLoading(true)
      try {
        const comments = await loadComments(selected.id)
        if (!cancelled) setSelectedComments(comments)
      } catch (error) {
        if (!cancelled) {
          setSelectedComments([])
          setNotice(getErrorMessage(error, 'Nie udało się pobrać komentarzy.'))
        }
      } finally {
        if (!cancelled) setCommentsLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [loadComments, selected])

  async function addSelectedComment(body: string) {
    if (!selected || !addComment) return
    const comment = await addComment(selected.id, body)
    setSelectedComments((current) => [...current, comment])
    setNotice('Komentarz zapisany.')
  }

  function canEditRow(item: Assessment) {
    return canEditAssessmentForUser(user, item)
  }

  function canAdvanceRow(item: Assessment) {
    return canAdvanceStatuses && canAdvanceAssessmentStatus(user, item)
  }

  function toggleSelect(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function toggleSelectAllVisible() {
    setSelectedIds((current) => {
      if (allVisibleSelected) return current.filter((id) => !rows.some((item) => item.id === id))
      return [...new Set([...current, ...rows.map((item) => item.id)])]
    })
  }

  function resetFilters() {
    setQuery('')
    setType('all')
    setLeader('all')
    setSpecialist('all')
    setStatus('all')
    setPeriod('all')
    setChangeFilter('all')
    setAdvancedFiltersOpen(false)
  }

  function applyPreset(preset: 'all' | 'decision' | 'recent' | 'edited') {
    setChangeFilter(preset)
    setAdvancedFiltersOpen(preset !== 'all')
    if (preset === 'all') {
      setQuery('')
      setType('all')
      setLeader('all')
      setSpecialist('all')
      setStatus('all')
      setPeriod('all')
    }
    if (preset === 'decision') {
      setStatus('all')
    }
  }

  async function advance(item: Assessment) {
    if (!canAdvanceRow(item)) {
      setNotice('Ta rola nie może zmieniać statusu tej karty.')
      return
    }
    const nextStatus = registryStatusTransitions[item.status]

  try {
      const note = buildRegistryStatusHistoryNote(
        `Zmiana statusu z ewidencji: ${statusLabels[item.status]} -> ${statusLabels[nextStatus]}`,
        '',
        [],
      )
      await onUpdate(appendRegistryStatusHistory(item, nextStatus, user, note))
      setNotice(`Status zmieniony na: ${statusLabels[nextStatus]}.`)
      recordDiagnostic({
        scope: 'registry',
        action: 'change-status',
        detail: `${item.spec} -> ${statusLabels[nextStatus]}`,
        level: 'success',
      })
    } catch (error) {
      setNotice(getErrorMessage(error, 'Nie udalo sie zmienic statusu.'))
    }
  }

  async function advanceSelected() {
    if (!selectedAdvanceable.length) {
      setNotice('Zaznacz co najmniej jedną kartę możliwą do przesunięcia.')
      return
    }
    try {
      await Promise.all(selectedAdvanceable.map((item) => onUpdate(appendRegistryStatusHistory(
        item,
        registryStatusTransitions[item.status],
        user,
        buildRegistryStatusHistoryNote(
          `Masowa zmiana statusu z ewidencji: ${statusLabels[item.status]} -> ${statusLabels[registryStatusTransitions[item.status]]}`,
          '',
          [],
        ),
      ))))
      setSelectedIds([])
      setNotice(`Przesunięto ${selectedAdvanceable.length} kart.`)
      recordDiagnostic({
        scope: 'registry',
        action: 'bulk-status',
        detail: `Przesunięto ${selectedAdvanceable.length} kart`,
        level: 'success',
      })
    } catch (error) {
      setNotice(getErrorMessage(error, 'Nie udalo sie wykonac masowej zmiany statusu.'))
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
      setNotice('Import jest zablokowany dla roli specjalisty.')
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
      recordDiagnostic({
        scope: 'registry',
        action: 'import',
        detail: `Zaimportowano ${valid.length} kart`,
        level: 'success',
      })
    } catch (error) {
      setNotice(getErrorMessage(error, 'Import nie powiódł się.'))
    }
  }

  async function exportRows(kind: 'csv' | 'excel' | 'json') {
    try {
      if (kind === 'csv') exportCsv(rows)
      if (kind === 'excel') await exportExcel(rows)
      if (kind === 'json') exportJson(rows)
      setNotice(t('registry.exportReady', 'Eksport {kind} przygotowany dla {count} pozycji.').replace('{kind}', kind.toUpperCase()).replace('{count}', String(rows.length)))
      recordDiagnostic({
        scope: 'registry',
        action: 'export',
        detail: `${kind.toUpperCase()} dla ${rows.length} pozycji`,
        level: 'info',
      })
    } catch (error) {
      setNotice(getErrorMessage(error, t('registry.exportError', 'Nie udało się przygotować eksportu.')))
    }
  }

  function printRow(item: Assessment) {
    if (!printAssessment(item)) setNotice(t('registry.printBlocked', 'Przeglądarka zablokowała nowe okno drukowania lub PDF.'))
    else {
      recordDiagnostic({
        scope: 'registry',
        action: 'print',
        detail: `Wydruk karty ${item.spec}`,
        level: 'info',
      })
    }
  }

  return (
    <main className="screen">
      <section className="toolbar-panel registry-toolbar">
        <label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isViewer ? t('registry.searchViewer') : t('registry.searchOper')} /></label>
        <select value={period} onChange={(event) => setPeriod(event.target.value)}>
          <option value="all">{t('registry.allPeriods')}</option>
          {periods.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={type} onChange={(event) => setType(event.target.value as AssessmentType | 'all')}>
          <option value="all">{t('registry.allTypes')}</option>
          <option value="r">Rozmowy</option>
          <option value="m">Maile</option>
          <option value="s">Systemy</option>
        </select>
        {!isViewer ? (
          <>
        <select value={leader} onChange={(event) => setLeader(event.target.value)}>
          <option value="all">{t('registry.allLeaders')}</option>
          {leaders.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={specialist} onChange={(event) => setSpecialist(event.target.value)}>
          <option value="all">{t('registry.allSpecialists')}</option>
          {specialists.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <label className="ghost-btn import-btn">
          <Upload size={16} /> {t('registry.importJson')}
          <input disabled={!canMutate} type="file" accept="application/json,.json" onChange={(event) => void importJson(event.target.files?.[0])} />
        </label>
        <button className="ghost-btn" type="button" onClick={() => setAdvancedFiltersOpen((value) => !value)}>
          {t('registry.moreFilters')}
        </button>
          </>
        ) : null}
      </section>

      {advancedFiltersOpen && !isViewer ? (
        <section className="registry-advanced-filters">
          <select value={status} onChange={(event) => setStatus(event.target.value as AssessmentStatus | 'all')}>
            <option value="all">{t('registry.allStatuses')}</option>
            {(Object.keys(statusLabels) as AssessmentStatus[]).map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}
          </select>
          <select value={changeFilter} onChange={(event) => setChangeFilter(event.target.value as 'all' | 'recent' | 'edited' | 'decision')}>
            <option value="all">{t('registry.allChanges')}</option>
            <option value="recent">{t('registry.active72h')}</option>
            <option value="edited">{t('registry.onlyEdited')}</option>
            <option value="decision">{t('registry.onlyDecision')}</option>
          </select>
        </section>
      ) : null}

      <section className="registry-ops-bar">
        <div className="registry-ops-copy">
          <span className="registry-ops-kicker">{isViewer ? t('registry.readOnlyView') : t('registry.operationalView')}</span>
          <strong>{isViewer ? `${rows.length} zatwierdzonych ocen` : `${rows.length} kart po filtrach`}</strong>
          <p>{notice || (isViewer
            ? t('registry.readOnlySummary')
            : t('registry.filterSummary'))}</p>
        </div>
        <div className="registry-ops-actions">
          {!isViewer ? (
            <div className="quick-filter-group">
              <button className={changeFilter === 'decision' ? 'active' : ''} type="button" onClick={() => applyPreset('decision')}>{t('registry.onlyDecision')}</button>
              <button className={changeFilter === 'recent' ? 'active' : ''} type="button" onClick={() => applyPreset('recent')}>{t('registry.active72h')}</button>
              <button className={changeFilter === 'edited' ? 'active' : ''} type="button" onClick={() => applyPreset('edited')}>{t('registry.onlyEdited')}</button>
              <button className={changeFilter === 'all' ? 'active' : ''} type="button" onClick={() => applyPreset('all')}>{t('registry.viewAll')}</button>
            </div>
          ) : null}
          <div className="registry-export-group">
            <button className="ghost-btn" type="button" onClick={() => void exportRows('csv')}><Download size={16} /> {t('registry.exportCsv')}</button>
            <button className="ghost-btn" type="button" onClick={() => void exportRows('excel')}><Download size={16} /> {t('registry.exportExcel')}</button>
            <button className="ghost-btn" type="button" onClick={() => void exportRows('json')}><Download size={16} /> {t('registry.exportJson')}</button>
          </div>
        </div>
      </section>

      <section className="registry-active-filters">
        <div className="registry-filter-chips">
          {activeFilterChips.length ? activeFilterChips.map((chip) => (
            <span className="filter-chip" key={chip}>{chip}</span>
          )) : <span className="filter-chip neutral">{t('registry.noFilters')}</span>}
        </div>
        <div className="registry-filter-actions">
          <button className="ghost-btn" disabled={!hasActiveFilters} type="button" onClick={resetFilters}>{t('registry.clearFilters')}</button>
          {canAdvanceStatuses ? <span className="hint-text">Najpierw ustaw filtr, potem zaznaczaj widoczne karty do przesuniecia.</span> : null}
          {isViewer ? <span className="hint-text">Lista zawiera wyłącznie oceny zatwierdzone przez lidera.</span> : null}
        </div>
      </section>

      <section className="registry-summary">
        <div className="status-chip">Wynik filtra: {rows.length}</div>
        {isViewer ? <div className="status-chip">{t('registry.viewMode')}</div> : <div className="status-chip">{t('registry.changed')}: {editedCount}</div>}
        {isViewer ? <div className="status-chip">{t('registry.readOnlyMode')}</div> : <div className="status-chip">{t('registry.active')}: {recentCount}</div>}
        {!isViewer ? <div className="status-chip">{t('registry.toDecision')}: {decisionCount}</div> : null}
      </section>

      <section className="data-panel">
        <div className="section-title"><span>{t('registry.queueTitle')}</span><small>{t('registry.queueSubtitle')}</small></div>
        <div className="registry-queue-head">
          <div className="registry-queue-copy">
            <strong>{decisionQueue.length} {t('registry.queueCount')}</strong>
            <small>{t('registry.queueHint')}</small>
          </div>
          {canAdvanceStatuses ? (
            <div className="bulk-actions">
              <span>{visibleSelectedIds.length} {t('registry.bulkSelected')}</span>
              <button className="ghost-btn" disabled={!rows.length} type="button" onClick={toggleSelectAllVisible}>{t('registry.selectVisible')}</button>
              <button className="ghost-btn" disabled={!visibleSelectedIds.length} type="button" onClick={() => setSelectedIds((current) => current.filter((id) => !visibleSelectedIds.includes(id)))}>{t('registry.clearSelection')}</button>
              <button className="primary-btn" disabled={!selectedAdvanceable.length} type="button" onClick={() => void advanceSelected()}><ShieldCheck size={15} /> {t('registry.changeStatus')}</button>
            </div>
          ) : null}
        </div>
        {decisionQueue.length ? (
          <div className="queue-grid">
            {decisionQueue.map((item) => (
              <button className="queue-card" key={item.id} type="button" onClick={() => setSelected(item)}>
                <strong>{item.spec}</strong>
                <span>{statusLabels[item.status]} • {item.period}</span>
                <small>{item.avgFinal}% • {item.oce || 'brak oceniajacego'}</small>
              </button>
            ))}
          </div>
        ) : <div className="empty-state compact-empty">{t('registry.noQueueShort', 'Brak kart w kolejce decyzji dla aktualnego filtra.')}</div>}
      </section>

      <section className="data-panel">
        <div className="section-title"><span>Ewidencja kart</span><small>{notice || `${rows.length} pozycji`}</small></div>
        {rows.length ? (
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
        ) : (
          <div className="registry-empty-state">
            <strong>{t('registry.noDataTitle', 'Brak kart dla bieżących filtrów')}</strong>
            <p>{t('registry.noDataHint')}</p>
            <div className="row-action-strip">
              <button className="ghost-btn" type="button" onClick={resetFilters}>{t('registry.clearFilters')}</button>
              <button className="primary-btn" type="button" onClick={() => applyPreset('all')}>{t('registry.viewAll')}</button>
            </div>
          </div>
        )}
        <div className="row-action-strip">
          {canAdvanceStatuses ? rows.filter(canAdvanceRow).slice(0, 6).map((item) => (
            <button key={item.id} className="ghost-btn" type="button" onClick={() => advance(item)}>
              {item.spec}: {statusLabels[item.status]} {'->'}
            </button>
          )) : <span className="hint-text">{t('registry.visibleOnlyReadOnly')}</span>}
        </div>
      </section>

      {selected ? (
        <AssessmentPreviewModal
          assessment={selected}
          user={user}
          onClose={() => {
            setSelected(null)
            setSelectedComments([])
          }}
          onPrint={printRow}
          onEdit={canMutate ? openEditor : undefined}
          onAdvance={canAdvanceStatuses ? advance : undefined}
          comments={selectedComments}
          commentsLoading={commentsLoading}
          onAddComment={addComment && !isViewer ? addSelectedComment : undefined}
        />
      ) : null}
      {editing ? <AssessmentEditModal assessment={editing} user={user} onClose={() => setEditing(null)} onSave={onUpdate} /> : null}
    </main>
  )
}

