/** Komponent przełącznika motywu */

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../lib/theme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle"
      title={theme === 'dark' ? 'Tryb jasny' : 'Tryb ciemny'}
      aria-label="Przełącz motyw"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
