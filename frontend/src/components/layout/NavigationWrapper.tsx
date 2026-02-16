'use client';

import React from 'react';

import { Navigation } from './Navigation';


interface NavigationWrapperProps {
  children: React.ReactNode;
}

export const NavigationWrapper: React.FC<NavigationWrapperProps> = ({ children }) => {
  return (
    <>
      <Navigation />
      <div className="lg:pl-64">
        {children}
      </div>
    </>
  );
};