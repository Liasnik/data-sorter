export type Locale = 'en' | 'ru' | 'uk'

type Dict = Record<string, string>

// Loaded from JSON files (tsconfig.resolveJsonModule=true)
import en from './locales/en.json'
import uk from './locales/uk.json'
import ru from './locales/ru.json'

export const dictionaries: Record<Locale, Dict> = { en, ru, uk }

export function resolveDefaultLocale(): Locale {
  const saved = localStorage.getItem('locale') as Locale | null
  if (saved && ['en','ru','uk'].includes(saved)) return saved
  const nav = navigator.language.toLowerCase()
  if (nav.startsWith('ru')) return 'ru'
  if (nav.startsWith('uk') || nav.startsWith('ua')) return 'uk'
  return 'en'
}

export function createTranslator(locale: Locale) {
  const dict = dictionaries[locale]
  return function t<K extends keyof typeof dict | string>(key: K): string {
    const d: Record<string, string> = dict
    const value = d[String(key)]
    return typeof value === 'string' ? value : String(key)
  }
}


