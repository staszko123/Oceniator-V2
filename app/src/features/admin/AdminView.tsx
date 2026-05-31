import { useMemo, useState } from 'react'
import { AlertTriangle, Plus, Save, Trash2, Users, X } from 'lucide-react'
import { canAdminRole } from '../../domain/access'
import { getErrorMessage } from '../../domain/errors'
import { shortDateTime } from '../../domain/history'
import type { DiagnosticEvent } from '../../domain/diagnostics'
import type { AdminConfig, AdminHistoryEntry, AssessmentPeriod, ManagedUser, Specialist, UserProfile } from '../../domain/types'
import { useLanguage } from '../../i18n/LanguageContext'
import { ROLE_LABELS, ROLE_OPTIONS } from '../../lib/display'

type AdminSection = 'goals' | 'dictionaries' | 'specialists' | 'users' | 'periods'

function buildAdminSections(t: (key: string, fallback?: string) => string): Array<{ key: AdminSection; label: string; description: string }> {
  return [
    { key: 'goals', label: t('admin.sections.goals.label', 'Cele'), description: t('admin.sections.goals.description', 'Progi, wolumeny i KPI okresowe.') },
    { key: 'dictionaries', label: t('admin.sections.dictionaries.label', 'SĹ‚owniki'), description: t('admin.sections.dictionaries.description', 'Liderzy, dziaĹ‚y i stanowiska.') },
    { key: 'specialists', label: t('admin.sections.specialists.label', 'SpecjaliĹ›ci'), description: t('admin.sections.specialists.description', 'Zakresy operacyjne i przypisania.') },
    { key: 'users', label: t('admin.sections.users.label', 'UĹĽytkownicy'), description: t('admin.sections.users.description', 'Role, dostÄ™py i nowe konta.') },
    { key: 'periods', label: t('admin.sections.periods.label', 'Okresy'), description: t('admin.sections.periods.description', 'Okna rozliczeniowe i nazewnictwo.') },
  ]
}

function emptySpecialist(admin: AdminConfig): Specialist {
  return {
    id: crypto.randomUUID(),
    name: '',
    leader: admin.leaders[0] || '',
    department: admin.departments[0] || '',
    position: admin.positions[0] || '',
    active: true,
  }
}

function normalizeDictionary(values: string[]): string[] {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pl'))
}

function DictionaryEditor({
  title,
  values,
  value,
  onValue,
  onAdd,
  onRemove,
  t,
}: {
  title: string
  values: string[]
  value: string
  onValue: (value: string) => void
  onAdd: () => void
  onRemove: (value: string) => void
  t: (key: string, fallback?: string) => string
}) {
  return (
    <div className="dictionary-editor">
      <h3>{title}</h3>
      <div className="dictionary-add">
        <input value={value} onChange={(event) => onValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onAdd() }} placeholder={t('admin.dictionary.placeholder', 'Nowa wartoĹ›Ä‡')} />
        <button type="button" onClick={onAdd}><Plus size={15} /></button>
      </div>
      <div className="dictionary-list">
        {values.map((item) => (
          <span key={item}><Users size={14} /> {item}<button type="button" onClick={() => onRemove(item)}><X size={12} /></button></span>
        ))}
      </div>
    </div>
  )
}

export default function AdminView({
  user,
  providerMode,
  admin,
  adminHistory,
  diagnostics,
  users,
  onAdminChange,
  onUserSave,
  onUserCreate,
}: {
  user: UserProfile
  providerMode: 'supabase' | 'local'
  admin: AdminConfig
  adminHistory: AdminHistoryEntry[]
  diagnostics: DiagnosticEvent[]
  users: ManagedUser[]
  onAdminChange: (admin: AdminConfig) => Promise<void>
  onUserSave: (user: ManagedUser) => Promise<void>
  onUserCreate: (user: ManagedUser) => Promise<ManagedUser>
}) {
  const { t } = useLanguage()
  const [draftAdmin, setDraftAdmin] = useState(admin)
  const [selectedSection, setSelectedSection] = useState<AdminSection>('goals')
  const [selectedSpecialistId, setSelectedSpecialistId] = useState(admin.specialists[0]?.id || '')
  const [draftUsers, setDraftUsers] = useState(users)
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id || '')
  const [newUser, setNewUser] = useState<ManagedUser>({
    id: '',
    email: '',
    login: '',
    fullName: '',
    role: 'viewer',
    leaderScope: '',
    isActive: true,
    source: user.source,
    password: '',
  })
  const [newLeader, setNewLeader] = useState('')
  const [newDepartment, setNewDepartment] = useState('')
  const [newPosition, setNewPosition] = useState('')
  const [specialistQuery, setSpecialistQuery] = useState('')
  const [userQuery, setUserQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserProfile['role']>('all')
  const [notice, setNotice] = useState('')
  const isSupabaseMode = providerMode === 'supabase'

  const selectedSpecialist = draftAdmin.specialists.find((item) => item.id === selectedSpecialistId) || draftAdmin.specialists[0] || emptySpecialist(draftAdmin)
  const selectedUser = draftUsers.find((item) => item.id === selectedUserId) || draftUsers[0]
  const filteredSpecialists = useMemo(() => draftAdmin.specialists.filter((item) => {
    const haystack = `${item.name} ${item.leader} ${item.department} ${item.position}`.toLowerCase()
    return haystack.includes(specialistQuery.trim().toLowerCase())
  }), [draftAdmin.specialists, specialistQuery])
  const filteredUsers = useMemo(() => draftUsers.filter((item) => {
    if (roleFilter !== 'all' && item.role !== roleFilter) return false
    const haystack = `${item.fullName} ${item.email} ${item.login || ''} ${item.leaderScope || ''}`.toLowerCase()
    return haystack.includes(userQuery.trim().toLowerCase())
  }), [draftUsers, roleFilter, userQuery])
  const configDirty = useMemo(() => JSON.stringify(draftAdmin) !== JSON.stringify(admin), [admin, draftAdmin])
  const usersDirty = useMemo(() => JSON.stringify(draftUsers) !== JSON.stringify(users), [draftUsers, users])
  const selectedUserDirty = useMemo(() => {
    if (!selectedUser) return false
    const sourceUser = users.find((item) => item.id === selectedUser.id)
    if (!sourceUser) return true
    return JSON.stringify(sourceUser) !== JSON.stringify(selectedUser)
  }, [selectedUser, users])
  const canCreateUser = isSupabaseMode
    ? Boolean((newUser.email || '').trim())
    : Boolean((newUser.email || '').trim() || (newUser.login || '').trim())
  const pendingBadges = [configDirty ? t('admin.pending.config', 'konfiguracja') : null, usersDirty ? t('admin.pending.users', 'uĹĽytkownicy') : null].filter(Boolean) as string[]
  const summaryStats = [
    `${t('admin.summary.specialists', 'SpecjaliĹ›ci')}: ${draftAdmin.specialists.length}`,
    `${t('admin.summary.active', 'Aktywni')}: ${draftAdmin.specialists.filter((item) => item.active).length}`,
    `${t('admin.summary.accounts', 'Konta')}: ${draftUsers.length}`,
    `${t('admin.summary.periods', 'Okresy')}: ${draftAdmin.periods.length}`,
  ]
  const adminSections = useMemo(() => buildAdminSections(t), [t])

  if (!canAdminRole(user.role)) {
    return (
      <main className="screen">
        <div className="empty-state">{t('admin.noAccess', 'Brak dostÄ™pu do panelu administratora dla tej roli.')}</div>
      </main>
    )
  }

  async function saveGoals() {
    const next = {
      ...draftAdmin,
      leaders: normalizeDictionary(draftAdmin.leaders),
      departments: normalizeDictionary(draftAdmin.departments),
      positions: normalizeDictionary(draftAdmin.positions),
      specialists: draftAdmin.specialists
        .filter((item) => item.name.trim())
        .map((item) => ({ ...item, name: item.name.trim() }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pl')),
    }
    try {
      await onAdminChange(next)
      setDraftAdmin(next)
      setNotice(`${t('admin.savedConfig', 'Zapisano konfiguracjÄ™')} ${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`)
    } catch (error) {
      setNotice(getErrorMessage(error, t('admin.saveConfigError', 'Nie udaĹ‚o siÄ™ zapisaÄ‡ konfiguracji.')))
    }
  }

  async function saveSelectedUser() {
    if (!selectedUser) return
    try {
      const isSelfDeactivation = selectedUser.id === user.id && selectedUser.isActive === false
      await onUserSave(selectedUser)
      if (isSelfDeactivation) return
      setDraftUsers((current) => current.map((item) => (item.id === selectedUser.id ? { ...selectedUser } : item)))
      setNotice(`${t('admin.savedUser', 'Zapisano uĹĽytkownika')} ${selectedUser.email || selectedUser.login}`)
    } catch (error) {
      setNotice(getErrorMessage(error, t('admin.saveUserError', 'Nie udaĹ‚o siÄ™ zapisaÄ‡ uĹĽytkownika.')))
    }
  }

  async function createNewUser() {
    if (isSupabaseMode ? !newUser.email : (!newUser.email && !newUser.login)) return
    const login = isSupabaseMode ? '' : (newUser.login || newUser.email.split('@')[0])
    const created = {
      ...newUser,
      id: newUser.id || login || newUser.email,
      login,
      email: newUser.email || `${login}@local`,
      fullName: newUser.fullName || newUser.email || login || 'Nowy uĹĽytkownik',
      password: isSupabaseMode ? (newUser.password || '') : (newUser.password || 'start123'),
      source: user.source,
    }
    try {
      const saved = await onUserCreate(created)
      setDraftUsers((current) => [saved, ...current])
      setSelectedUserId(saved.id)
      setNewUser({ ...newUser, id: '', email: '', login: '', fullName: '', password: '', role: 'viewer', leaderScope: '', isActive: true })
      setSelectedSection('users')
      setNotice(`${t('admin.createdUser', 'Dodano uĹĽytkownika')} ${saved.email || saved.login}`)
    } catch (error) {
      setNotice(getErrorMessage(error, t('admin.createUserError', 'Nie udaĹ‚o siÄ™ utworzyÄ‡ uĹĽytkownika.')))
    }
  }

  function updateUserDraft(id: string, patch: Partial<ManagedUser>) {
    setDraftUsers((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function updateGoals(field: keyof AdminConfig['goals'], value: number) {
    setDraftAdmin({ ...draftAdmin, goals: { ...draftAdmin.goals, [field]: value } })
  }

  function addDictionary(kind: 'leaders' | 'departments' | 'positions', value: string, clear: () => void) {
    const name = value.trim()
    if (!name) return
    setDraftAdmin({ ...draftAdmin, [kind]: normalizeDictionary([...draftAdmin[kind], name]) })
    clear()
  }

  function removeDictionary(kind: 'leaders' | 'departments' | 'positions', value: string) {
    if (typeof window !== 'undefined' && !window.confirm(t('admin.confirm.removeDictionary', 'UsunÄ…Ä‡ wartoĹ›Ä‡ "{value}" ze sĹ‚ownika?').replace('{value}', value))) return
    setDraftAdmin({
      ...draftAdmin,
      [kind]: draftAdmin[kind].filter((item) => item !== value),
    })
  }

  function updateSpecialist(id: string, patch: Partial<Specialist>) {
    setDraftAdmin({
      ...draftAdmin,
      specialists: draftAdmin.specialists.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })
  }

  function addSpecialist() {
    const specialist = emptySpecialist(draftAdmin)
    setDraftAdmin({ ...draftAdmin, specialists: [specialist, ...draftAdmin.specialists] })
    setSelectedSpecialistId(specialist.id)
    setSelectedSection('specialists')
  }

  function removeSpecialist(id: string) {
    const specialist = draftAdmin.specialists.find((item) => item.id === id)
    if (typeof window !== 'undefined' && !window.confirm(t('admin.confirm.removeSpecialist', 'UsunÄ…Ä‡ specjalistÄ™ "{name}" z listy?').replace('{name}', specialist?.name || t('admin.specialist.unnamed', 'bez nazwy')))) return
    const next = draftAdmin.specialists.filter((item) => item.id !== id)
    setDraftAdmin({ ...draftAdmin, specialists: next })
    setSelectedSpecialistId(next[0]?.id || '')
  }

  function updatePeriod(index: number, patch: Partial<AssessmentPeriod>) {
    setDraftAdmin({
      ...draftAdmin,
      periods: draftAdmin.periods.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    })
  }

  function addPeriod() {
    const number = draftAdmin.periods.length + 1
    setDraftAdmin({
      ...draftAdmin,
      periods: [...draftAdmin.periods, { code: `P${number}`, name: `P${number}`, from: '01-01', to: '12-31' }],
    })
    setSelectedSection('periods')
  }

  function removePeriod(index: number) {
    const period = draftAdmin.periods[index]
    if (typeof window !== 'undefined' && !window.confirm(t('admin.confirm.removePeriod', 'UsunÄ…Ä‡ okres "{name}"?').replace('{name}', period?.name || period?.code || String(index + 1)))) return
    setDraftAdmin({ ...draftAdmin, periods: draftAdmin.periods.filter((_, itemIndex) => itemIndex !== index) })
  }

  return (
    <main className="screen admin-screen">
      <section className="admin-hero data-panel">
        <div>
          <div className="section-title"><span>{t('admin.title', 'Panel administratora')}</span><small>{notice || t('admin.subtitle', 'Konfiguracja sĹ‚ownikĂłw, celĂłw i dostÄ™pĂłw')}</small></div>
          <p className="hint-text">{t('admin.hint', 'Ten widok zasila formularz oceny, zakresy liderĂłw, okresy i konta. Zapis jest jawny, ĹĽeby ograniczyÄ‡ przypadkowe zmiany.')}</p>
          <div className="status-chips">
            {summaryStats.map((item) => <span className="status-chip neutral" key={item}>{item}</span>)}
            {pendingBadges.length ? pendingBadges.map((item) => <span className="status-chip" key={item}>{t('admin.pendingPrefix', 'Niezapisane')}: {item}</span>) : <span className="status-chip success">{t('admin.noPending', 'Brak oczekujÄ…cych zmian')}</span>}
          </div>
        </div>
        <button className="primary-btn" disabled={!configDirty} onClick={saveGoals} type="button"><Save size={16} /> {t('admin.saveConfig', 'Zapisz konfiguracjÄ™')}</button>
      </section>

      <section className="admin-section-nav data-panel">
        <div className="admin-section-tabs">
          {adminSections.map((section) => (
            <button
              key={section.key}
              className={selectedSection === section.key ? 'active' : ''}
              type="button"
              onClick={() => setSelectedSection(section.key)}
            >
              <strong>{section.label}</strong>
              <span>{section.description}</span>
            </button>
          ))}
        </div>
      </section>

      {selectedSection === 'goals' ? (
        <section className="data-panel">
          <div className="section-title"><span>{t('admin.goalsTitle', 'Cele jakoĹ›ciowe')}</span><small>{t('admin.goalsSubtitle', 'progi i wolumeny')}</small></div>
          <div className="field-grid two">
            <label><span>{t('admin.goal.minAvg', 'Minimum sredniej')}</span><input type="number" value={draftAdmin.goals.minAvg} onChange={(event) => updateGoals('minAvg', Number(event.target.value))} /></label>
            <label><span>{t('admin.goal.greatShare', 'Udzial bardzo dobrych')}</span><input type="number" value={draftAdmin.goals.greatShare} onChange={(event) => updateGoals('greatShare', Number(event.target.value))} /></label>
            <label><span>{t('admin.goal.callsPerPeriod', 'Rozmowy / okres')}</span><input type="number" value={draftAdmin.goals.callsPerPeriod} onChange={(event) => updateGoals('callsPerPeriod', Number(event.target.value))} /></label>
            <label><span>{t('admin.goal.mailsPerPeriod', 'Maile / okres')}</span><input type="number" value={draftAdmin.goals.mailsPerPeriod} onChange={(event) => updateGoals('mailsPerPeriod', Number(event.target.value))} /></label>
            <label><span>{t('admin.goal.systemsPerPeriod', 'Systemy / okres')}</span><input type="number" value={draftAdmin.goals.systemsPerPeriod} onChange={(event) => updateGoals('systemsPerPeriod', Number(event.target.value))} /></label>
          </div>
        </section>
      ) : null}

      {selectedSection === 'dictionaries' ? (
        <section className="data-panel dictionary-panel">
          <div className="section-title"><span>{t('admin.dictionaryTitle', 'SĹ‚owniki')}</span><small>{t('admin.dictionarySubtitle', 'liderzy, dziaĹ‚y, stanowiska')}</small></div>
          <div className="dictionary-columns">
            <DictionaryEditor
              title={t('admin.dictionary.leaders', 'Liderzy')}
              values={draftAdmin.leaders}
              value={newLeader}
              onValue={setNewLeader}
              onAdd={() => addDictionary('leaders', newLeader, () => setNewLeader(''))}
              onRemove={(value) => removeDictionary('leaders', value)}
              t={t}
            />
            <DictionaryEditor
              title={t('admin.dictionary.departments', 'DziaĹ‚y')}
              values={draftAdmin.departments}
              value={newDepartment}
              onValue={setNewDepartment}
              onAdd={() => addDictionary('departments', newDepartment, () => setNewDepartment(''))}
              onRemove={(value) => removeDictionary('departments', value)}
              t={t}
            />
            <DictionaryEditor
              title={t('admin.dictionary.positions', 'Stanowiska')}
              values={draftAdmin.positions}
              value={newPosition}
              onValue={setNewPosition}
              onAdd={() => addDictionary('positions', newPosition, () => setNewPosition(''))}
              onRemove={(value) => removeDictionary('positions', value)}
              t={t}
            />
          </div>
        </section>
      ) : null}

      {selectedSection === 'specialists' ? (
        <section className="data-panel specialist-admin">
          <div className="section-title">
            <span>{t('admin.specialistsTitle', 'SpecjaliĹ›ci')}</span>
            <small>{draftAdmin.specialists.filter((item) => item.active).length} {t('admin.activeCount', 'aktywnych')} / {draftAdmin.specialists.length} {t('admin.totalCount', 'Ĺ‚Ä…cznie')}</small>
          </div>
          <div className="specialist-layout">
            <div className="specialist-list">
              <button className="ghost-btn wide" type="button" onClick={addSpecialist}><Plus size={16} /> {t('admin.addSpecialist', 'Dodaj specjalistÄ™')}</button>
              <div className="list-toolbar">
                <input value={specialistQuery} onChange={(event) => setSpecialistQuery(event.target.value)} placeholder={t('admin.specialistSearchPlaceholder', 'Szukaj specjalisty, lidera lub dziaĹ‚u')} />
                <small>{filteredSpecialists.length} {t('admin.results', 'wynikĂłw')}</small>
              </div>
              {filteredSpecialists.map((specialist) => (
                <button
                  key={specialist.id}
                  className={specialist.id === selectedSpecialist.id ? 'active' : ''}
                  type="button"
                  onClick={() => setSelectedSpecialistId(specialist.id)}
                >
                  <strong>{specialist.name || t('admin.specialist.new', 'Nowy specjalista')}</strong>
                  <small>{specialist.leader || t('admin.specialist.noLeader', 'Bez lidera')} - {specialist.active ? t('admin.specialist.active', 'aktywny') : t('admin.specialist.inactive', 'nieaktywny')}</small>
                </button>
              ))}
              {!filteredSpecialists.length ? <div className="empty-state compact-empty">{t('admin.specialistEmpty', 'Brak specjalistĂłw dla tego filtra.')}</div> : null}
            </div>
            <div className="specialist-editor">
              <div className="field-grid two">
                <label><span>{t('admin.specialist.name', 'ImiÄ™ i nazwisko')}</span><input value={selectedSpecialist.name} onChange={(event) => updateSpecialist(selectedSpecialist.id, { name: event.target.value })} /></label>
                <label><span>{t('admin.specialist.leader', 'Lider')}</span><select value={selectedSpecialist.leader} onChange={(event) => updateSpecialist(selectedSpecialist.id, { leader: event.target.value })}>{draftAdmin.leaders.map((leader) => <option key={leader} value={leader}>{leader}</option>)}</select></label>
                <label><span>{t('admin.specialist.department', 'DziaĹ‚')}</span><select value={selectedSpecialist.department} onChange={(event) => updateSpecialist(selectedSpecialist.id, { department: event.target.value })}>{draftAdmin.departments.map((department) => <option key={department} value={department}>{department}</option>)}</select></label>
                <label><span>{t('admin.specialist.position', 'Stanowisko')}</span><select value={selectedSpecialist.position} onChange={(event) => updateSpecialist(selectedSpecialist.id, { position: event.target.value })}>{draftAdmin.positions.map((position) => <option key={position} value={position}>{position}</option>)}</select></label>
              </div>
              <div className="admin-inline-actions">
                <label className="toggle-line"><input type="checkbox" checked={selectedSpecialist.active} onChange={(event) => updateSpecialist(selectedSpecialist.id, { active: event.target.checked })} /> {t('admin.specialist.activeToggle', 'Aktywny specjalista')}</label>
                <button className="ghost-btn" type="button" onClick={() => removeSpecialist(selectedSpecialist.id)}><Trash2 size={16} /> {t('admin.removeFromList', 'UsuĹ„ z listy')}</button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {selectedSection === 'users' ? (
        <section className="data-panel user-admin">
          <div className="section-title"><span>{t('admin.usersTitle', 'UĹĽytkownicy i role')}</span><small>{draftUsers.length} {t('admin.accounts', 'kont')}</small></div>
          <p className="hint-text">
            {isSupabaseMode
              ? t('admin.usersHintSupabase', 'W trybie Supabase sterujesz prawdziwymi uprawnieniami konta: rola, leader scope i aktywnoĹ›Ä‡ trafiajÄ… do profiles i od razu wpĹ‚ywajÄ… na RLS.')
              : t('admin.usersHintLocal', 'W trybie lokalnym zmiany dziaĹ‚ajÄ… na danych demo i sĹ‚uĹĽÄ… tylko do testowania ukĹ‚adu uprawnieĹ„.')}
          </p>
          <div className="user-layout">
            <div className="user-list">
              <div className="list-toolbar">
                <input value={userQuery} onChange={(event) => setUserQuery(event.target.value)} placeholder={t('admin.userSearchPlaceholder', 'Szukaj po imieniu, e-mailu lub loginie')} />
                <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as 'all' | UserProfile['role'])}>
                  <option value="all">{t('admin.role.all', 'Wszystkie role')}</option>
                  {ROLE_OPTIONS.map(([role, label]) => <option key={role} value={role}>{label}</option>)}
                </select>
              </div>
              {filteredUsers.map((account) => (
                <button
                  key={account.id}
                  className={account.id === selectedUser?.id ? 'active' : ''}
                  type="button"
                  onClick={() => setSelectedUserId(account.id)}
                >
                  <strong>{account.fullName || account.email || account.login}</strong>
                  <small>{ROLE_LABELS[account.role]} - {account.isActive ? t('admin.user.active', 'aktywny') : t('admin.user.inactive', 'nieaktywny')}</small>
                </button>
              ))}
              {!filteredUsers.length ? <div className="empty-state compact-empty">{t('admin.userEmptyFiltered', 'Brak uĹĽytkownikĂłw dla tego filtra.')}</div> : null}
            </div>
            <div className="user-editor">
              {selectedUser ? (
                <>
                  <div className="field-grid two">
                    <label><span>{t('admin.user.email', 'Email')}</span><input value={selectedUser.email} onChange={(event) => updateUserDraft(selectedUser.id, { email: event.target.value })} /></label>
                    <label><span>{t('admin.user.fullName', 'ImiÄ™ i nazwisko')}</span><input value={selectedUser.fullName} onChange={(event) => updateUserDraft(selectedUser.id, { fullName: event.target.value })} /></label>
                    <label><span>{t('admin.user.role', 'Rola')}</span><select value={selectedUser.role} onChange={(event) => updateUserDraft(selectedUser.id, { role: event.target.value as UserProfile['role'] })}>{ROLE_OPTIONS.map(([role, label]) => <option key={role} value={role}>{label}</option>)}</select></label>
                    <label><span>{t('admin.user.leaderScope', 'Zakres lidera')}</span><select value={selectedUser.leaderScope} onChange={(event) => updateUserDraft(selectedUser.id, { leaderScope: event.target.value })}><option value="">{t('admin.user.noLeaderScope', 'Brak / peĹ‚ny zakres')}</option>{draftAdmin.leaders.map((leader) => <option key={leader} value={leader}>{leader}</option>)}</select></label>
                    {!isSupabaseMode ? (
                      <>
                        <label><span>{t('admin.user.localLogin', 'Login lokalny')}</span><input value={selectedUser.login || ''} onChange={(event) => updateUserDraft(selectedUser.id, { login: event.target.value })} /></label>
                        <label><span>{t('admin.user.password', 'HasĹ‚o lokalne / startowe')}</span><input type="password" value={selectedUser.password || ''} onChange={(event) => updateUserDraft(selectedUser.id, { password: event.target.value })} /></label>
                      </>
                    ) : (
                      <div className="empty-state compact-empty">
                        {t('admin.user.supabaseNote', 'W Supabase login lokalny i hasĹ‚o nie sterujÄ… dostÄ™pem. Zmieniaj role, zakres i aktywnoĹ›Ä‡.')}
                      </div>
                    )}
                  </div>
                  <div className="admin-inline-actions">
                    <label className="toggle-line"><input type="checkbox" checked={selectedUser.isActive} onChange={(event) => updateUserDraft(selectedUser.id, { isActive: event.target.checked })} /> {t('admin.user.activeToggle', 'Konto aktywne')}</label>
                    <button className="primary-btn" disabled={!selectedUserDirty} type="button" onClick={saveSelectedUser}><Save size={16} /> {t('admin.saveUser', 'Zapisz uĹĽytkownika')}</button>
                  </div>
                </>
              ) : <div className="empty-state">{t('admin.userEmpty', 'Brak uĹĽytkownikĂłw.')}</div>}
            </div>
          </div>
          <div className="new-user-panel">
            <div className="section-title"><span>{t('admin.newUserTitle', 'Nowe konto')}</span><small>{user.source === 'supabase' ? t('admin.newUserSourceSupabase', 'tworzone przez Edge Function') : t('admin.newUserSourceLocal', 'konto lokalne demo')}</small></div>
            <div className="field-grid">
              <label><span>{t('admin.user.email', 'Email')}</span><input value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} /></label>
              <label><span>{t('admin.user.fullName', 'ImiÄ™ i nazwisko')}</span><input value={newUser.fullName} onChange={(event) => setNewUser({ ...newUser, fullName: event.target.value })} /></label>
              {!isSupabaseMode ? (
                <>
                  <label><span>{t('admin.user.localLogin', 'Login lokalny')}</span><input value={newUser.login || ''} onChange={(event) => setNewUser({ ...newUser, login: event.target.value })} /></label>
                  <label><span>{t('admin.user.passwordStart', 'HasĹ‚o startowe')}</span><input type="password" value={newUser.password || ''} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} /></label>
                </>
              ) : (
                <label><span>{t('admin.user.passwordOptional', 'HasĹ‚o startowe (opcjonalne)')}</span><input type="password" value={newUser.password || ''} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} /></label>
              )}
              <label><span>{t('admin.user.role', 'Rola')}</span><select value={newUser.role} onChange={(event) => setNewUser({ ...newUser, role: event.target.value as UserProfile['role'] })}>{ROLE_OPTIONS.map(([role, label]) => <option key={role} value={role}>{label}</option>)}</select></label>
              <label><span>{t('admin.user.leaderScope', 'Zakres lidera')}</span><select value={newUser.leaderScope} onChange={(event) => setNewUser({ ...newUser, leaderScope: event.target.value })}><option value="">{t('admin.user.noLeaderScope', 'Brak / peĹ‚ny zakres')}</option>{draftAdmin.leaders.map((leader) => <option key={leader} value={leader}>{leader}</option>)}</select></label>
            </div>
            <p className="hint-text">
              {isSupabaseMode
                ? t('admin.createUserHintSupabase', 'JeĹ›li hasĹ‚o zostawisz puste, Supabase wyĹ›le zaproszenie na e-mail. Rola i leader scope ustawiajÄ… dostÄ™p od razu po utworzeniu profilu.')
                : t('admin.createUserHintLocal', 'W lokalnym trybie tworzone jest konto demo z lokalnym loginem i hasĹ‚em startowym.')}
            </p>
            <button className="ghost-btn" disabled={!canCreateUser} type="button" onClick={createNewUser}><Plus size={16} /> {isSupabaseMode ? t('admin.createUserSupabase', 'UtwĂłrz / zaproĹ› konto') : t('admin.createUser', 'UtwĂłrz konto')}</button>
          </div>
        </section>
      ) : null}

      {selectedSection === 'periods' ? (
        <section className="data-panel periods-panel">
          <div className="section-title"><span>{t('admin.periodsTitle', 'Okresy rozliczeniowe')}</span><small>{draftAdmin.periods.length} {t('admin.periodsCountSuffix', 'okresy')}</small></div>
          <div className="period-grid">
            {draftAdmin.periods.map((period, index) => (
              <div className="period-row" key={`${period.code}-${index}`}>
                <input value={period.code} onChange={(event) => updatePeriod(index, { code: event.target.value })} />
                <input value={period.name} onChange={(event) => updatePeriod(index, { name: event.target.value })} />
                <input value={period.from} onChange={(event) => updatePeriod(index, { from: event.target.value })} />
                <input value={period.to} onChange={(event) => updatePeriod(index, { to: event.target.value })} />
                <button type="button" onClick={() => removePeriod(index)}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          <button className="ghost-btn" type="button" onClick={addPeriod}><Plus size={16} /> {t('admin.addPeriod', 'Dodaj okres')}</button>
        </section>
      ) : null}

      <section className="admin-change-bar">
        <div className="admin-change-copy">
          <span className="admin-change-kicker">{t('admin.workState', 'Stan roboczy')}</span>
          <strong>{pendingBadges.length ? t('admin.hasPending', `Masz ${pendingBadges.length} obszary z niezapisanymi zmianami`).replace('{count}', String(pendingBadges.length)) : t('admin.allSaved', 'Wszystkie zmiany sÄ… zapisane')}</strong>
          <p>{selectedSection === 'users' ? t('admin.workStateUsers', 'Zmiany uĹĽytkownikĂłw zapisujesz osobno na poziomie wybranego konta.') : t('admin.workStateOther', 'Zmiany konfiguracji sĹ‚ownikĂłw, specjalistĂłw i okresĂłw zapisz jednym przyciskiem z nagĹ‚Ăłwka.')}</p>
        </div>
        {pendingBadges.length ? (
          <div className="admin-change-warning">
            <AlertTriangle size={16} />
            <span>{t('admin.leaveWarning', 'Przed opuszczeniem panelu zapisz zmiany konfiguracji.')}</span>
          </div>
        ) : null}
      </section>

      <section className="data-panel admin-history-panel">
        <div className="section-title">
          <span>{t('admin.historyTitle', 'Ostatnie zmiany')}</span>
          <small>{t('admin.historySubtitle', 'audyt konfiguracji i kont')}</small>
        </div>
        {adminHistory.length ? (
          <div className="admin-history-list">
            {adminHistory.slice(0, 8).map((entry) => (
              <article key={entry.id || `${entry.changedAt}-${entry.description}`} className="admin-history-item">
                <div className="admin-history-copy">
                  <strong>{entry.description}</strong>
                  <p>{entry.changedBy}</p>
                </div>
                <small>{shortDateTime(entry.changedAt)}</small>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state compact-empty">{t('admin.historyEmpty', 'Brak wpisow audytu dla tego konta.')}</div>
        )}
      </section>

      <section className="data-panel admin-history-panel">
        <div className="section-title">
          <span>{t('admin.diagnosticsTitle', 'Diagnostyka')}</span>
          <small>{t('admin.diagnosticsSubtitle', 'ostatnie zdarzenia aplikacji')}</small>
        </div>
        {diagnostics.length ? (
          <div className="admin-history-list">
            {diagnostics.slice(0, 8).map((event) => (
              <article key={event.id} className="admin-history-item">
                <div className="admin-history-copy">
                  <strong>{event.action}</strong>
                  <p>{event.detail}</p>
                </div>
                <small>{shortDateTime(event.at)}</small>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state compact-empty">{t('admin.diagnosticsEmpty', 'Brak zapisanych zdarzeĹ„ diagnostycznych.')}</div>
        )}
      </section>

    </main>
  )
}
