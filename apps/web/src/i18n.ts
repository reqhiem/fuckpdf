import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enEdit from './locales/en.edit.json'
import en from './locales/en.json'
import enOptions from './locales/en.options.json'
import enPreview from './locales/en.preview.json'
import enTool from './locales/en.tool.json'

void i18n.use(initReactI18next).init({
  resources: { en: { translation: { ...en, ...enOptions, ...enTool, ...enPreview, ...enEdit } } },
  fallbackLng: 'en',
  lng: 'en',
  interpolation: { escapeValue: false },
})

export { i18n }
