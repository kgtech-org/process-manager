import { useTranslation as useI18nTranslation } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import commonFr from '../../public/locales/fr/common.json';
import authFr from '../../public/locales/fr/auth.json';
import activityFr from '../../public/locales/fr/activity.json';
import dashboardFr from '../../public/locales/fr/dashboard.json';
import usersFr from '../../public/locales/fr/users.json';
import departmentsFr from '../../public/locales/fr/departments.json';
import jobPositionsFr from '../../public/locales/fr/jobPositions.json';
import documentsFr from '../../public/locales/fr/documents.json';
import notificationsFr from '../../public/locales/fr/notifications.json';
import collaborationFr from '../../public/locales/fr/collaboration.json';

import commonEn from '../../public/locales/en/common.json';
import authEn from '../../public/locales/en/auth.json';
import activityEn from '../../public/locales/en/activity.json';
import dashboardEn from '../../public/locales/en/dashboard.json';
import usersEn from '../../public/locales/en/users.json';
import departmentsEn from '../../public/locales/en/departments.json';
import jobPositionsEn from '../../public/locales/en/jobPositions.json';
import documentsEn from '../../public/locales/en/documents.json';
import notificationsEn from '../../public/locales/en/notifications.json';
import collaborationEn from '../../public/locales/en/collaboration.json';

const resources = {
  fr: {
    common: commonFr,
    auth: authFr,
    activity: activityFr,
    dashboard: dashboardFr,
    users: usersFr,
    departments: departmentsFr,
    jobPositions: jobPositionsFr,
    documents: documentsFr,
    notifications: notificationsFr,
    collaboration: collaborationFr,
  },
  en: {
    common: commonEn,
    auth: authEn,
    activity: activityEn,
    dashboard: dashboardEn,
    users: usersEn,
    departments: departmentsEn,
    jobPositions: jobPositionsEn,
    documents: documentsEn,
    notifications: notificationsEn,
    collaboration: collaborationEn,
  },
};

// Initialize i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    defaultNS: 'common',
    ns: ['common', 'auth', 'activity', 'dashboard', 'users', 'departments', 'jobPositions', 'documents', 'notifications', 'collaboration'],

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ['cookie', 'navigator', 'htmlTag'],
      caches: ['cookie'],
    },

    react: {
      useSuspense: false,
    },
  });

// Set French as default language for client-side only
if (typeof window !== 'undefined' && !localStorage.getItem('i18nextLng')) {
  i18n.changeLanguage('fr');
}

export default i18n;

// Custom hook for translation
export const useTranslation = (namespace?: string) => {
  return useI18nTranslation(namespace || 'common');
};

// Language switcher helper
export const changeLanguage = (lang: 'fr' | 'en') => {
  i18n.changeLanguage(lang);
  // Update API headers for backend
  if (typeof window !== 'undefined') {
    localStorage.setItem('preferred-language', lang);
  }
};

// Get current language
export const getCurrentLanguage = (): string => {
  return i18n.language || 'fr';
};

// Available languages
export const languages = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];