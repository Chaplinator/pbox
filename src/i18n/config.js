import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './en.json'
import es from './es.json'

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'es',
    defaultNS: 'common',
    ns: ['common', 'auth', 'nav', 'inventory', 'orders', 'users', 'forms', 'errors', 'admin', 'perfil', 'master_gm'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    resources: {
      en: {
        common: en.common,
        auth: en.auth,
        nav: en.nav,
        inventory: en.inventory,
        orders: en.orders,
        users: en.users,
        forms: en.forms,
        errors: en.errors,
        admin: en.admin,
        perfil: en.perfil,
        master_gm: en.master_gm,
      },
      es: {
        common: es.common,
        auth: es.auth,
        nav: es.nav,
        inventory: es.inventory,
        orders: es.orders,
        users: es.users,
        forms: es.forms,
        errors: es.errors,
        admin: es.admin,
        perfil: es.perfil,
        master_gm: es.master_gm,
      },
    },
  })

export default i18next
