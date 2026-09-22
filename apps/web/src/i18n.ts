import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
// Per-tool option labels live in their own catalog so the tool panels and the shell can be
// edited without fighting over one file.
import enOptions from './locales/en.options.json'
import enTool from './locales/en.tool.json'

void i18n.use(initReactI18next).init({
  resources: { en: { translation: { ...en, ...enOptions, ...enTool } } },
  fallbackLng: 'en',
  lng: 'en',
  interpolation: { escapeValue: false },
})

export { i18n }
