import { useState } from 'react'
import { Plus, Save, Trash2, Users, X } from 'lucide-react'
import type { AdminConfig, AssessmentPeriod, ManagedUser, Specialist, UserProfile } from '../../domain/types'

const roleLabels: Record<UserProfile['role'], string> = {
  admin: 'Administrator',
  director: 'Dyrektor',
  leader: 'Lider',
  assessor: 'Oceniający',
  viewer: 'Podgląd',
}

function canAdmin(user: UserProfile): boolean {
  return ['admin', 'director'].includes(user.role)
}

function readableError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error.trim()) return error
  return fallback
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
}: {
  title: string
  values: string[]
  value: string
  onValue: (value: string) => void
  onAdd: () => void
  onRemove: (value: string) => void
}) {
  return (
    <div className="dictionary-editor">
      <h3>{title}</h3>
      <div className="dictionary-add">
        <input value={value} onChange={(event) => onValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onAdd() }} placeholder="Nowa wartość" />
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
  admin,
  users,
  onAdminChange,
  onUserSave,
  onUserCreate,
}: {
  user: UserProfile
  admin: AdminConfig
  users: ManagedUser[]
  onAdminChange: (admin: AdminConfig) => Promise<void>
  onUserSave: (user: ManagedUser) => Promise<void>
  onUserCreate: (user: ManagedUser) => Promise<ManagedUser>
}) {
  const [draftAdmin, setDraftAdmin] = useState(admin)
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
  const [notice, setNotice] = useState('')

  const selectedSpecialist = draftAdmin.specialists.find((item) => item.id === selectedSpecialistId) || draftAdmin.specialists[0] || emptySpecialist(draftAdmin)
  const selectedUser = draftUsers.find((item) => item.id === selectedUserId) || draftUsers[0]

  if (!canAdmin(user)) {
    return (
      <main className="screen">
        <div className="empty-state">Brak dostępu do panelu administratora dla tej roli.</div>
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
      setNotice(`Zapisano konfiguracje ${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`)
    } catch (error) {
      setNotice(readableError(error, 'Nie udało się zapisać konfiguracji.'))
    }
  }

  async function saveSelectedUser() {
    if (!selectedUser) return
    try {
      await onUserSave(selectedUser)
      setNotice(`Zapisano uzytkownika ${selectedUser.email || selectedUser.login}`)
    } catch (error) {
      setNotice(readableError(error, 'Nie udało się zapisać uzytkownika.'))
    }
  }

  async function createNewUser() {
    if (!newUser.email && !newUser.login) return
    const created = {
      ...newUser,
      id: newUser.id || newUser.login || newUser.email,
      email: newUser.email || `${newUser.login}@local`,
      fullName: newUser.fullName || newUser.email || newUser.login || 'Nowy uzytkownik',
      password: newUser.password || 'start123',
      source: user.source,
    }
    try {
      const saved = await onUserCreate(created)
      setDraftUsers((current) => [saved, ...current])
      setSelectedUserId(saved.id)
      setNewUser({ ...newUser, id: '', email: '', login: '', fullName: '', password: '', role: 'viewer', leaderScope: '', isActive: true })
      setNotice(`Dodano uzytkownika ${saved.email || saved.login}`)
    } catch (error) {
      setNotice(readableError(error, 'Nie udało się utworzyc uzytkownika.'))
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
  }

  function removeSpecialist(id: string) {
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
  }

  function removePeriod(index: number) {
    setDraftAdmin({ ...draftAdmin, periods: draftAdmin.periods.filter((_, itemIndex) => itemIndex !== index) })
  }

  return (
    <main className="screen admin-screen">
      <section className="admin-hero data-panel">
        <div>
          <div className="section-title"><span>Panel administratora</span><small>{notice || 'Konfiguracja slownikow i celow'}</small></div>
          <p className="hint-text">Zmiany w tym widoku zasilaja formularz oceny, zakres liderów oraz raporty. Zapis jest jawny, żeby uniknac przypadkowych zmian slownikow.</p>
        </div>
        <button className="primary-btn" onClick={saveGoals} type="button"><Save size={16} /> Zapisz konfiguracje</button>
      </section>
      <section className="data-panel">
        <div className="section-title"><span>Cele jakościowe</span><small>progi i wolumeny</small></div>
        <div className="field-grid two">
          <label><span>Minimum sredniej</span><input type="number" value={draftAdmin.goals.minAvg} onChange={(event) => updateGoals('minAvg', Number(event.target.value))} /></label>
          <label><span>Udzial bardzo dobrych</span><input type="number" value={draftAdmin.goals.greatShare} onChange={(event) => updateGoals('greatShare', Number(event.target.value))} /></label>
          <label><span>Rozmowy / okres</span><input type="number" value={draftAdmin.goals.callsPerPeriod} onChange={(event) => updateGoals('callsPerPeriod', Number(event.target.value))} /></label>
          <label><span>Maile / okres</span><input type="number" value={draftAdmin.goals.mailsPerPeriod} onChange={(event) => updateGoals('mailsPerPeriod', Number(event.target.value))} /></label>
          <label><span>Systemy / okres</span><input type="number" value={draftAdmin.goals.systemsPerPeriod} onChange={(event) => updateGoals('systemsPerPeriod', Number(event.target.value))} /></label>
        </div>
      </section>
      <section className="data-panel dictionary-panel">
        <div className="section-title"><span>Słowniki</span><small>liderzy, dzialy, stanowiska</small></div>
        <div className="dictionary-columns">
          <DictionaryEditor
            title="Liderzy"
            values={draftAdmin.leaders}
            value={newLeader}
            onValue={setNewLeader}
            onAdd={() => addDictionary('leaders', newLeader, () => setNewLeader(''))}
            onRemove={(value) => removeDictionary('leaders', value)}
          />
          <DictionaryEditor
            title="Działy"
            values={draftAdmin.departments}
            value={newDepartment}
            onValue={setNewDepartment}
            onAdd={() => addDictionary('departments', newDepartment, () => setNewDepartment(''))}
            onRemove={(value) => removeDictionary('departments', value)}
          />
          <DictionaryEditor
            title="Stanowiska"
            values={draftAdmin.positions}
            value={newPosition}
            onValue={setNewPosition}
            onAdd={() => addDictionary('positions', newPosition, () => setNewPosition(''))}
            onRemove={(value) => removeDictionary('positions', value)}
          />
        </div>
      </section>
      <section className="data-panel specialist-admin">
        <div className="section-title">
          <span>Specjaliści</span>
          <small>{draftAdmin.specialists.filter((item) => item.active).length} aktywnych / {draftAdmin.specialists.length} lacznie</small>
        </div>
        <div className="specialist-layout">
          <div className="specialist-list">
            <button className="ghost-btn wide" type="button" onClick={addSpecialist}><Plus size={16} /> Dodaj specjalistę</button>
            {draftAdmin.specialists.map((specialist) => (
              <button
                key={specialist.id}
                className={specialist.id === selectedSpecialist.id ? 'active' : ''}
                type="button"
                onClick={() => setSelectedSpecialistId(specialist.id)}
              >
                <strong>{specialist.name || 'Nowy specjalista'}</strong>
                <small>{specialist.leader || 'Bez lidera'} • {specialist.active ? 'aktywny' : 'nieaktywny'}</small>
              </button>
            ))}
          </div>
          <div className="specialist-editor">
            <div className="field-grid two">
              <label><span>Imię i nazwisko</span><input value={selectedSpecialist.name} onChange={(event) => updateSpecialist(selectedSpecialist.id, { name: event.target.value })} /></label>
              <label><span>Lider</span><select value={selectedSpecialist.leader} onChange={(event) => updateSpecialist(selectedSpecialist.id, { leader: event.target.value })}>{draftAdmin.leaders.map((leader) => <option key={leader} value={leader}>{leader}</option>)}</select></label>
              <label><span>Dział</span><select value={selectedSpecialist.department} onChange={(event) => updateSpecialist(selectedSpecialist.id, { department: event.target.value })}>{draftAdmin.departments.map((department) => <option key={department} value={department}>{department}</option>)}</select></label>
              <label><span>Stanowisko</span><select value={selectedSpecialist.position} onChange={(event) => updateSpecialist(selectedSpecialist.id, { position: event.target.value })}>{draftAdmin.positions.map((position) => <option key={position} value={position}>{position}</option>)}</select></label>
            </div>
            <div className="admin-inline-actions">
              <label className="toggle-line"><input type="checkbox" checked={selectedSpecialist.active} onChange={(event) => updateSpecialist(selectedSpecialist.id, { active: event.target.checked })} /> Aktywny specjalista</label>
              <button className="ghost-btn" type="button" onClick={() => removeSpecialist(selectedSpecialist.id)}><Trash2 size={16} /> Usuń z listy</button>
            </div>
          </div>
        </div>
      </section>
      <section className="data-panel user-admin">
        <div className="section-title"><span>Użytkownicy i role</span><small>{draftUsers.length} kont</small></div>
        <div className="user-layout">
          <div className="user-list">
            {draftUsers.map((account) => (
              <button
                key={account.id}
                className={account.id === selectedUser?.id ? 'active' : ''}
                type="button"
                onClick={() => setSelectedUserId(account.id)}
              >
                <strong>{account.fullName || account.email || account.login}</strong>
                <small>{roleLabels[account.role]} • {account.isActive ? 'aktywny' : 'nieaktywny'}</small>
              </button>
            ))}
          </div>
          <div className="user-editor">
            {selectedUser ? (
              <>
                <div className="field-grid two">
                  <label><span>Email</span><input value={selectedUser.email} onChange={(event) => updateUserDraft(selectedUser.id, { email: event.target.value })} /></label>
                  <label><span>Login lokalny</span><input value={selectedUser.login || ''} onChange={(event) => updateUserDraft(selectedUser.id, { login: event.target.value })} /></label>
                  <label><span>Imię i nazwisko</span><input value={selectedUser.fullName} onChange={(event) => updateUserDraft(selectedUser.id, { fullName: event.target.value })} /></label>
                  <label><span>Rola</span><select value={selectedUser.role} onChange={(event) => updateUserDraft(selectedUser.id, { role: event.target.value as UserProfile['role'] })}>{Object.entries(roleLabels).map(([role, label]) => <option key={role} value={role}>{label}</option>)}</select></label>
                  <label><span>Zakres lidera</span><select value={selectedUser.leaderScope} onChange={(event) => updateUserDraft(selectedUser.id, { leaderScope: event.target.value })}><option value="">Brak / pelny zakres</option>{draftAdmin.leaders.map((leader) => <option key={leader} value={leader}>{leader}</option>)}</select></label>
                  <label><span>Hasło lokalne / startowe</span><input type="password" value={selectedUser.password || ''} onChange={(event) => updateUserDraft(selectedUser.id, { password: event.target.value })} /></label>
                </div>
                <div className="admin-inline-actions">
                  <label className="toggle-line"><input type="checkbox" checked={selectedUser.isActive} onChange={(event) => updateUserDraft(selectedUser.id, { isActive: event.target.checked })} /> Konto aktywne</label>
                  <button className="primary-btn" type="button" onClick={saveSelectedUser}><Save size={16} /> Zapisz uzytkownika</button>
                </div>
              </>
            ) : <div className="empty-state">Brak uzytkownikow.</div>}
          </div>
        </div>
        <div className="new-user-panel">
          <div className="section-title"><span>Nowe konto</span><small>{user.source === 'supabase' ? 'tworzone przez Edge Function' : 'konto lokalne demo'}</small></div>
          <div className="field-grid">
            <label><span>Email</span><input value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} /></label>
            <label><span>Login lokalny</span><input value={newUser.login || ''} onChange={(event) => setNewUser({ ...newUser, login: event.target.value })} /></label>
            <label><span>Imię i nazwisko</span><input value={newUser.fullName} onChange={(event) => setNewUser({ ...newUser, fullName: event.target.value })} /></label>
            <label><span>Hasło startowe</span><input type="password" value={newUser.password || ''} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} /></label>
            <label><span>Rola</span><select value={newUser.role} onChange={(event) => setNewUser({ ...newUser, role: event.target.value as UserProfile['role'] })}>{Object.entries(roleLabels).map(([role, label]) => <option key={role} value={role}>{label}</option>)}</select></label>
            <label><span>Zakres lidera</span><select value={newUser.leaderScope} onChange={(event) => setNewUser({ ...newUser, leaderScope: event.target.value })}><option value="">Brak / pelny zakres</option>{draftAdmin.leaders.map((leader) => <option key={leader} value={leader}>{leader}</option>)}</select></label>
          </div>
          <button className="ghost-btn" type="button" onClick={createNewUser}><Plus size={16} /> Utworz konto</button>
        </div>
      </section>
      <section className="data-panel periods-panel">
        <div className="section-title"><span>Okresy rozliczeniowe</span><small>{draftAdmin.periods.length} okresy</small></div>
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
        <button className="ghost-btn" type="button" onClick={addPeriod}><Plus size={16} /> Dodaj okres</button>
      </section>
    </main>
  )
}
