'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { Language, TRANSLATIONS, TranslationDictionary } from './translations'

export { type Language } from './translations'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: keyof TranslationDictionary | string, fallback?: string) => string
  dictionary: TranslationDictionary
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const STORAGE_KEY = 'isguide_language'

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')
  const [mounted, setMounted] = useState(false)

  // Initialize from localStorage or cookie on client mount
  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'hi' || stored === 'te' || stored === 'en') {
        setLanguageState(stored)
        if (typeof document !== 'undefined') {
          document.documentElement.lang = stored
        }
        return
      }

      // Check cookie fallback
      const match = document.cookie.match(/(?:^|; )isguide_language=([^;]*)/)
      const cookieLang = match ? decodeURIComponent(match[1]) : null
      if (cookieLang === 'hi' || cookieLang === 'te' || cookieLang === 'en') {
        setLanguageState(cookieLang)
        if (typeof document !== 'undefined') {
          document.documentElement.lang = cookieLang
        }
      }
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }, [])

  const setLanguage = useCallback((newLang: Language) => {
    if (newLang !== 'en' && newLang !== 'hi' && newLang !== 'te') return
    setLanguageState(newLang)
    try {
      localStorage.setItem(STORAGE_KEY, newLang)
      document.cookie = `isguide_language=${newLang}; path=/; max-age=31536000; SameSite=Lax`
      if (typeof document !== 'undefined') {
        document.documentElement.lang = newLang
      }
    } catch {
      // Ignore storage errors
    }
  }, [])

  const dictionary = useMemo(() => {
    return TRANSLATIONS[language] || TRANSLATIONS.en
  }, [language])

  const t = useCallback(
    (key: keyof TranslationDictionary | string, fallback?: string): string => {
      const dict = TRANSLATIONS[language] || TRANSLATIONS.en
      const val = (dict as any)[key]
      if (typeof val === 'string' && val.length > 0) {
        return val
      }
      const enDict = TRANSLATIONS.en
      const enVal = (enDict as any)[key]
      if (typeof enVal === 'string' && enVal.length > 0) {
        return enVal
      }
      return fallback || key
    },
    [language]
  )

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      dictionary,
    }),
    [language, setLanguage, t, dictionary]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    // Graceful fallback if used outside provider
    const defaultDict = TRANSLATIONS.en
    return {
      language: 'en' as Language,
      setLanguage: () => {},
      t: (key: keyof TranslationDictionary | string, fallback?: string) =>
        (defaultDict as any)[key] || fallback || key,
      dictionary: defaultDict,
    }
  }
  return context
}
