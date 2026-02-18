'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import Image from 'next/image';
import {
  CheckCircle2,
  FileText,
  Users,
  BarChart3,
  Image as ImageIcon,
  MessageSquare,
  FileDown,
  CheckSquare,
  Shield,
  UsersIcon,
  TrendingUp,
  BookOpen,
  HeadphonesIcon,
  GraduationCap,
  MessageCircle
} from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const { t } = useTranslation('landing');
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && user) {
      router.push('/macros');
    }
  }, [isAuthenticated, user, router]);

  if (isAuthenticated && user) {
    return null; // Prevent flashing content while redirecting
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Image
              src="/logo.png"
              alt="YAS Logo"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="text-xl font-bold text-gray-900">{t('header.title')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <LanguageSwitcher />
            <Button onClick={() => router.push('/login')} variant="ghost" size="sm">
              {t('header.signIn')}
            </Button>
            <Button onClick={() => router.push('/register')} size="sm">
              {t('header.getStarted')}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 py-16 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-6">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                <Shield className="w-4 h-4 mr-2" />
                {t('hero.badge')}
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl font-bold text-gray-900 leading-tight">
                  {t('hero.title')}{' '}
                  <span className="text-blue-600">{t('hero.titleHighlight')}</span>
                </h1>
                <p className="text-lg text-gray-600 leading-relaxed">
                  {t('hero.subtitle')}
                </p>
              </div>

              {/* Key Benefits */}
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{t('hero.benefits.multiStep')}</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{t('hero.benefits.collaboration')}</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{t('hero.benefits.analytics')}</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => router.push('/register')}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {t('hero.cta.getStarted')}
                </Button>
                <Button
                  onClick={() => router.push('/login')}
                  variant="outline"
                  size="lg"
                >
                  {t('hero.cta.signIn')}
                </Button>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>{t('hero.info')}</span>
              </div>
            </div>

            {/* Right Content - Illustration */}
            <div className="flex items-center justify-center">
              <Image
                src="/illustration.png"
                alt="Process Management Illustration"
                width={700}
                height={700}
                className="w-full max-w-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="px-4 py-16 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t('benefits.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('benefits.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl border border-blue-100">
              <CheckSquare className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('benefits.items.structured.title')}
              </h3>
              <p className="text-gray-600 text-sm">
                {t('benefits.items.structured.description')}
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-xl border border-green-100">
              <Shield className="w-10 h-10 text-green-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('benefits.items.traceability.title')}
              </h3>
              <p className="text-gray-600 text-sm">
                {t('benefits.items.traceability.description')}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl border border-purple-100">
              <UsersIcon className="w-10 h-10 text-purple-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('benefits.items.collaboration.title')}
              </h3>
              <p className="text-gray-600 text-sm">
                {t('benefits.items.collaboration.description')}
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-white p-6 rounded-xl border border-orange-100">
              <TrendingUp className="w-10 h-10 text-orange-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('benefits.items.analytics.title')}
              </h3>
              <p className="text-gray-600 text-sm">
                {t('benefits.items.analytics.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t('features.title')}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="group p-8 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-lg transition-all duration-300">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <FileText className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('features.cards.documentCreation.title')}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t('features.cards.documentCreation.description')}
              </p>
            </div>

            <div className="group p-8 rounded-xl border border-gray-200 bg-white hover:border-green-300 hover:shadow-lg transition-all duration-300">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('features.cards.contributorManagement.title')}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t('features.cards.contributorManagement.description')}
              </p>
            </div>

            <div className="group p-8 rounded-xl border border-gray-200 bg-white hover:border-purple-300 hover:shadow-lg transition-all duration-300">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('features.cards.analytics.title')}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t('features.cards.analytics.description')}
              </p>
            </div>

            <div className="group p-8 rounded-xl border border-gray-200 bg-white hover:border-orange-300 hover:shadow-lg transition-all duration-300">
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ImageIcon className="w-7 h-7 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('features.cards.richAnnexes.title')}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t('features.cards.richAnnexes.description')}
              </p>
            </div>

            <div className="group p-8 rounded-xl border border-gray-200 bg-white hover:border-teal-300 hover:shadow-lg transition-all duration-300">
              <div className="w-14 h-14 bg-teal-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-7 h-7 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('features.cards.collaboration.title')}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t('features.cards.collaboration.description')}
              </p>
            </div>

            <div className="group p-8 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-lg transition-all duration-300">
              <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <FileDown className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('features.cards.pdfExport.title')}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t('features.cards.pdfExport.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-4 py-16 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-4">
              {t('howItWorks.badge')}
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t('howItWorks.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('howItWorks.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('howItWorks.steps.create.title')}
              </h3>
              <p className="text-gray-600">
                {t('howItWorks.steps.create.description')}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('howItWorks.steps.collaborate.title')}
              </h3>
              <p className="text-gray-600">
                {t('howItWorks.steps.collaborate.description')}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('howItWorks.steps.validate.title')}
              </h3>
              <p className="text-gray-600">
                {t('howItWorks.steps.validate.description')}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-600 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                4
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('howItWorks.steps.analyze.title')}
              </h3>
              <p className="text-gray-600">
                {t('howItWorks.steps.analyze.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section className="px-4 py-16 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t('support.title')}
            </h2>
            <p className="text-xl text-gray-600">
              {t('support.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <BookOpen className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">
                {t('support.items.documentation.title')}
              </h3>
              <p className="text-sm text-gray-600">
                {t('support.items.documentation.description')}
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <HeadphonesIcon className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">
                {t('support.items.support.title')}
              </h3>
              <p className="text-sm text-gray-600">
                {t('support.items.support.description')}
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <GraduationCap className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">
                {t('support.items.training.title')}
              </h3>
              <p className="text-sm text-gray-600">
                {t('support.items.training.description')}
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <MessageCircle className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">
                {t('support.items.feedback.title')}
              </h3>
              <p className="text-sm text-gray-600">
                {t('support.items.feedback.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {t('cta.title')}
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            {t('cta.subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => router.push('/register')}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-lg px-8"
            >
              {t('cta.getStarted')}
            </Button>
            <Button
              onClick={() => router.push('/login')}
              variant="outline"
              size="lg"
              className="text-lg px-8"
            >
              {t('cta.signIn')}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-12 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <Image
                  src="/logo.png"
                  alt="YAS Logo"
                  width={32}
                  height={32}
                  className="rounded-lg"
                />
                <span className="text-lg font-semibold text-white">{t('footer.title')}</span>
              </div>
              <p className="text-sm text-gray-400 mb-2">
                {t('footer.tagline')}
              </p>
              <p className="text-sm text-gray-500">
                {t('footer.madeFor')}
              </p>
            </div>

            <div className="md:text-right">
              <p className="text-sm">
                {t('footer.copyright')}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
            <p>&copy; 2025 Process Manager by YAS</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
