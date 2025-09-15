module.exports = {
  i18n: {
    defaultLocale: 'fr',
    locales: ['fr', 'en'],
  },
  fallbackLng: 'fr',
  ns: ['common', 'auth', 'dashboard', 'activity', 'validation'],
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
};