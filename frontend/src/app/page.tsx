'use client';

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
  AlertCircle,
  ShieldAlert,
  Mail,
  TrendingDown,
  ArrowRight,
  Zap,
  Award,
  Clock,
  Target
} from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const { t } = useTranslation('landing');
  const router = useRouter();

  if (isAuthenticated && user) {
    router.push('/dashboard');
    return null;
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
      <section className="px-4 py-20 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                <Award className="w-4 h-4 mr-2" />
                {t('hero.badge')}
              </div>

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
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">{t('hero.benefits.multiStep')}</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">{t('hero.benefits.collaboration')}</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
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
                  {t('hero.cta.createAccount')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  onClick={() => router.push('/login')}
                  variant="outline"
                  size="lg"
                >
                  {t('hero.cta.signIn')}
                </Button>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>{t('hero.trustedBy')}</span>
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
              <div className="absolute -top-4 -right-4 w-72 h-72 bg-blue-200 rounded-full opacity-20 -z-10"></div>
              <div className="absolute -bottom-4 -left-4 w-56 h-56 bg-indigo-200 rounded-full opacity-20 -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Problems Section */}
      <section className="px-4 py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t('problems.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('problems.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('problems.items.chaos.title')}
              </h3>
              <p className="text-gray-600 text-sm">
                {t('problems.items.chaos.description')}
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <ShieldAlert className="w-10 h-10 text-orange-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('problems.items.compliance.title')}
              </h3>
              <p className="text-gray-600 text-sm">
                {t('problems.items.compliance.description')}
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <Mail className="w-10 h-10 text-yellow-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('problems.items.collaboration.title')}
              </h3>
              <p className="text-gray-600 text-sm">
                {t('problems.items.collaboration.description')}
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <TrendingDown className="w-10 h-10 text-purple-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('problems.items.performance.title')}
              </h3>
              <p className="text-gray-600 text-sm">
                {t('problems.items.performance.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="px-4 py-16 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium mb-6">
            <Zap className="w-4 h-4 mr-2" />
            {t('solution.badge')}
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {t('solution.title')}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('solution.subtitle')}
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-16 bg-gradient-to-b from-white to-gray-50">
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
            <div className="group p-8 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-xl transition-all duration-300">
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

            <div className="group p-8 rounded-xl border border-gray-200 bg-white hover:border-green-300 hover:shadow-xl transition-all duration-300">
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

            <div className="group p-8 rounded-xl border border-gray-200 bg-white hover:border-purple-300 hover:shadow-xl transition-all duration-300">
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

            <div className="group p-8 rounded-xl border border-gray-200 bg-white hover:border-orange-300 hover:shadow-xl transition-all duration-300">
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

            <div className="group p-8 rounded-xl border border-gray-200 bg-white hover:border-teal-300 hover:shadow-xl transition-all duration-300">
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

            <div className="group p-8 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-xl transition-all duration-300">
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

      {/* Stats Section */}
      <section className="px-4 py-16 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              {t('stats.title')}
            </h2>
            <p className="text-xl text-blue-100">
              {t('stats.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">{t('stats.items.time.value')}</div>
              <div className="text-blue-100">{t('stats.items.time.label')}</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">{t('stats.items.compliance.value')}</div>
              <div className="text-blue-100">{t('stats.items.compliance.label')}</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">{t('stats.items.collaboration.value')}</div>
              <div className="text-blue-100">{t('stats.items.collaboration.label')}</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">{t('stats.items.performance.value')}</div>
              <div className="text-blue-100">{t('stats.items.performance.label')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="px-4 py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-8 md:p-12 rounded-2xl shadow-lg">
            <div className="text-center mb-6">
              <div className="text-5xl text-blue-600 mb-4">&ldquo;</div>
              <p className="text-xl text-gray-700 leading-relaxed mb-6">
                {t('testimonial.quote')}
              </p>
            </div>
            <div className="text-center border-t border-gray-200 pt-6">
              <p className="font-semibold text-gray-900">{t('testimonial.author')}</p>
              <p className="text-gray-600">{t('testimonial.role')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="px-4 py-20 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {t('cta.title')}
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            {t('cta.subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button
              onClick={() => router.push('/register')}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-lg px-8"
            >
              {t('cta.createAccount')}
              <ArrowRight className="w-5 h-5 ml-2" />
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

          <div className="grid md:grid-cols-3 gap-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>{t('cta.features.trial')}</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>{t('cta.features.support')}</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>{t('cta.features.migration')}</span>
            </div>
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
                {t('footer.builtFor')}
              </p>
            </div>

            <div className="md:text-right">
              <p className="text-sm">
                {t('footer.copyright')}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
            <p>&copy; 2025 Process Manager by YAS & Togocom</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
