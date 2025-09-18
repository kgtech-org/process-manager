import React from 'react';
import Image from 'next/image';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 overflow-hidden">
      <div className="flex h-screen">
        {/* Left Side - Branding and Visual */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-gray-300 via-gray-200 to-gray-100 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full opacity-10"></div>
            <div className="absolute top-1/3 right-20 w-24 h-24 bg-white rounded-full opacity-10"></div>
            <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-white rounded-full opacity-10"></div>
            <div className="absolute bottom-1/3 right-10 w-20 h-20 bg-white rounded-full opacity-10"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-center items-center p-12 text-gray-800">
            {/* Logo */}
            <div className="mb-8">
              <Image
                src="/logo.png"
                alt="YAS Logo"
                width={80}
                height={80}
                className="rounded-2xl shadow-lg"
              />
            </div>

            {/* Brand Title */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4 text-gray-900">Process Manager</h1>
              <p className="text-xl text-gray-700 leading-relaxed max-w-md">
                Digital process management platform for telecommunications operational excellence
              </p>
            </div>

            {/* Illustration */}
            <div className="relative">
              <Image
                src="/illustration.jpg"
                alt="Process Management Illustration"
                width={400}
                height={300}
                className="rounded-xl shadow-2xl border-4 border-white/20"
              />
              
              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-500/20 rounded-full backdrop-blur-sm flex items-center justify-center border border-blue-500/30">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <div className="absolute -bottom-4 -left-4 w-14 h-14 bg-green-500/20 rounded-full backdrop-blur-sm flex items-center justify-center border border-green-500/30">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>

            {/* Key Features */}
            <div className="mt-12 grid grid-cols-1 gap-4 text-sm">
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-gray-600">Collaborative document creation</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-gray-600">Digital signature workflows</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-gray-600">Performance analytics</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Authentication Form */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
            <div className="w-full max-w-md">
              {/* Mobile Logo */}
              <div className="lg:hidden text-center mb-6">
                <div className="flex justify-center mb-3">
                  <Image
                    src="/logo.png"
                    alt="YAS Logo"
                    width={50}
                    height={50}
                    className="rounded-xl"
                  />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Process Manager</h1>
                <p className="text-gray-600 text-sm mt-1">Digital process management platform</p>
              </div>

              {/* Form Container */}
              <div>
                {children}
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <footer className="p-6 text-center text-xs text-gray-500 bg-white/50">
            <p>&copy; 2025 YAS & Togocom. All rights reserved.</p>
            <p className="mt-1">Built for telecommunications operational excellence</p>
          </footer>
        </div>
      </div>
    </div>
  );
}