/** Ekran logowania */

import { useState } from 'react'
import { ShieldCheck, Database, PanelRight } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import type { DataProvider } from '../../domain/types'

const localDemoAccounts = 'admin/admin123, lider01/lider123, lider02/lider123, lider/lider123, oceniajacy/ocena123, podglad/podglad123'

interface LoginScreenProps {
  provider: DataProvider
  onLogin: (login: string, password: string) => Promise<void>
  onLocalDemo: () => Promise<void>
}

export function LoginScreen({ provider, onLogin, onLocalDemo }: LoginScreenProps) {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onLogin(login, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zalogować.')
    } finally {
      setBusy(false)
    }
  }

  async function startLocalDemo() {
    setBusy(true)
    setError('')
    try {
      await onLocalDemo()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się uruchomić lokalnego demo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-page animate-fade-in">
      <section className="login-hero">
        <div className="brand-mark">
          <span />
          <div>
            <strong>Oceniator</strong>
            <small>System Oceny Jakości</small>
          </div>
        </div>
        <h1>Centrum oceny jakości obsługi</h1>
        <p>
          Kompleksowe narzędzie do zarządzania procesem oceny jakości rozmów, maili i systemów.
          Przejrzyste raporty, ewidencja i panel administracyjny w jednym miejscu.
        </p>
        <div className="login-proof">
          <div><ShieldCheck size={18} /> Role i zakresy</div>
          <div><Database size={18} /> Supabase lub demo lokalne</div>
          <div><PanelRight size={18} /> Panele wyników</div>
        </div>
      </section>
      <section className="login-card glass-subtle">
        <div className="section-title">
          <span>{provider.mode === 'supabase' ? 'Logowanie Supabase' : 'Tryb lokalny'}</span>
          <small>{provider.mode === 'supabase' ? 'Konta produkcyjne' : 'Konta demo'}</small>
        </div>
        <form onSubmit={submit} className="stack">
          <Input
            label={provider.mode === 'supabase' ? 'Email' : 'Login'}
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoFocus
            placeholder="Wpisz login"
          />
          <Input
            label="Hasło"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Wpisz hasło"
          />
          {error && <div className="error-box">{error}</div>}
          <Button fullWidth loading={busy} type="submit">
            {busy ? 'Logowanie...' : 'Wejdź do aplikacji'}
          </Button>
        </form>
        <Button variant="secondary" fullWidth disabled={busy} onClick={() => void startLocalDemo()} className="wide">
          Uruchom lokalne demo jako admin
        </Button>
        <p className="hint-text">Konta demo: {localDemoAccounts}.</p>
      </section>
    </main>
  )
}
