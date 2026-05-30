/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Language } from '../types/language'
import { getLanguagePreference, setLanguagePreference } from '../services/settingsService'
import { translate } from './messages'

type LanguageContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string, fallback?: string) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => getLanguagePreference())

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage: (next) => {
      setLanguageState(next)
      setLanguagePreference(next)
    },
    t: (key, fallback) => translate(language, key, fallback),
  }), [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const value = useContext(LanguageContext)
  if (!value) {
    return {
      language: getLanguagePreference(),
      setLanguage: (next: Language) => setLanguagePreference(next),
      t: (key: string, fallback?: string) => translate(getLanguagePreference(), key, fallback),
    }
  }
  return value
}
