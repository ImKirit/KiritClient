import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import de from './locales/de.json'

/**
 * Englisch ist Standard, Deutsch ist umschaltbar (Owner-Entscheidung 2026-07-27).
 *
 * Weitere Sprachen brauchen KEINE Codeänderung: JSON-Datei unter `locales/`
 * ablegen und hier in `resources` + `SUPPORTED_LANGUAGES` eintragen. Deshalb läuft
 * jeder sichtbare Text von Anfang an über diese Dateien und nie hart im Code.
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' }
] as const

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code']

const STORAGE_KEY = 'kiritclient.language'

function initialLanguage(): LanguageCode {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) {
    return stored as LanguageCode
  }
  return 'en'
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de }
  },
  lng: initialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
})

export function setLanguage(code: LanguageCode): void {
  localStorage.setItem(STORAGE_KEY, code)
  void i18n.changeLanguage(code)
}

export default i18n
