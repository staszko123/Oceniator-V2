/** Komponent przełącznika motywu */

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../lib/theme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const title = theme === 'dark' ? 'Tryb jasny' : 'Tryb ciemny'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle"
      title={title}
      aria-label={title}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
