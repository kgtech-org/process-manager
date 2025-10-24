'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import Image from 'next/image';

export default function HomePage() {
  const { isAuthenticated, user, logout } = useAuth();
  const { t } = useTranslation('landing');
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (isAuthenticated && user) {
    // Redirect authenticated users to dashboard
    router.push('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="px-4 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Image
              src="/logo.png"
              alt="YAS Logo"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="text-2xl font-bold text-gray-900">{t('header.title')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <LanguageSwitcher />
            <Button onClick={() => router.push('/login')} variant="ghost">
              {t('header.signIn')}
            </Button>
            <Button onClick={() => router.push('/register')}>
              {t('header.getStarted')}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl font-bold text-gray-900 leading-tight">
                  {t('hero.title')}{' '}
                  <span className="text-blue-600">{t('hero.titleHighlight')}</span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  {t('hero.subtitle')}
                </p>
              </div>

              {/* Key Benefits */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700 font-medium">{t('hero.benefits.multiStep')}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700 font-medium">{t('hero.benefits.collaboration')}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700 font-medium">{t('hero.benefits.analytics')}</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex space-x-4">
                <Button
                  onClick={() => router.push('/register')}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {t('hero.cta.createAccount')}
                </Button>
                <Button
                  onClick={() => router.push('/login')}
                  variant="outline"
                  size="lg"
                >
                  {t('hero.cta.signIn')}
                </Button>
              </div>
            </div>

            {/* Right Content - Illustration */}
            <div className="relative">
              <div className="relative z-10">
                <Image
                  src="/illustration.jpg"
                  alt="Process Management Illustration"
                  width={600}
                  height={450}
                  className="rounded-2xl shadow-2xl"
                />
              </div>
              {/* Background shapes */}
              <div className="absolute -top-4 -right-4 w-72 h-72 bg-blue-200 rounded-full opacity-20 -z-10"></div>
              <div className="absolute -bottom-4 -left-4 w-56 h-56 bg-indigo-200 rounded-full opacity-20 -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-16 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t('features.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Interactive Document Creation */}
            <div className="group p-8 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-200 transition-colors">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('features.cards.documentCreation.title')}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t('features.cards.documentCreation.description')}
              </p>
            </div>

            {/* Contributor Management */}
            <div className="group p-8 rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-lg transition-all duration-300">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-200 transition-colors">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('features.cards.contributorManagement.title')}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t('features.cards.contributorManagement.description')}
              </p>
            </div>

            {/* Process Analytics */}
            <div className="group p-8 rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all duration-300">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-200 transition-colors">
                <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('features.cards.analytics.title')}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t('features.cards.analytics.description')}
              </p>
            </div>

            {/* Rich Annexes */}
            <div className="group p-8 rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all duration-300">
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-orange-200 transition-colors">
                <svg className="w-7 h-7 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('features.cards.richAnnexes.title')}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t('features.cards.richAnnexes.description')}
              </p>
            </div>

            {/* Collaborative Workflows */}
            <div className="group p-8 rounded-xl border border-gray-200 hover:border-teal-300 hover:shadow-lg transition-all duration-300">
              <div className="w-14 h-14 bg-teal-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-teal-200 transition-colors">
                <svg className="w-7 h-7 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('features.cards.collaboration.title')}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t('features.cards.collaboration.description')}
              </p>
            </div>

            {/* PDF Export */}
            <div className="group p-8 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-300">
              <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-200 transition-colors">
                <svg className="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('features.cards.pdfExport.title')}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t('features.cards.pdfExport.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-16 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            {t('cta.title')}
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            {t('cta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => router.push('/register')}
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-50"
            >
              {t('cta.createAccount')}
            </Button>
            <Button
              onClick={() => router.push('/login')}
              variant="outline"
              size="lg"
              className="border-white text-white hover:bg-white hover:text-blue-600"
            >
              {t('cta.signIn')}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex justify-center items-center space-x-3 mb-4">
            <Image
              src="/logo.png"
              alt="YAS Logo"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-lg font-semibold text-white">{t('footer.title')}</span>
          </div>
          <p className="text-sm">
            {t('footer.copyright')}
          </p>
        </div>
      </footer>
    </div>
  );
}