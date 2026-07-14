import React from 'react';
import { createHashRouter } from 'react-router-dom';

// Layouts
import PublicLayout from './components/layout/PublicLayout.tsx';
import AuthLayout from './components/layout/AuthLayout.tsx';
import ProtectedRoute from './components/layout/ProtectedRoute.tsx';
import AppShell from './components/layout/AppShell.tsx';

// Public & Auth Pages
import LandingPage from './pages/public/LandingPage.tsx';
import LoginPage from './pages/auth/LoginPage.tsx';
import SignupPage from './pages/auth/SignupPage.tsx';

// Protected Pages
import DashboardPage from './pages/DashboardPage.tsx';
import TablesPage from './pages/TablesPage.tsx';
import MenuPage from './pages/MenuPage.tsx';
import QueuePage from './pages/QueuePage.tsx';

import RoleGuard from './components/auth/RoleGuard.tsx';

import SettingsPage from './pages/SettingsPage.tsx';

import DigitalMenuApp from '../../digital-menu/src/App.tsx';

export const router = createHashRouter([
  {
    element: <PublicLayout />,
    children: [
      {
        path: '/',
        element: <LandingPage />,
      },
      {
        path: '/digital-menu/:outletId',
        element: <DigitalMenuApp />,
      },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/signup',
        element: <SignupPage />,
      },
    ],
  },
  {
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      {
        path: '/tables',
        element: <TablesPage />,
      },
      {
        path: '/menu',
        element: <MenuPage />,
      },
      {
        path: '/queue',
        element: <QueuePage />,
      },
      {
        path: '/settings',
        element: (
          <RoleGuard allowedRoles={['owner', 'manager']}>
            <SettingsPage />
          </RoleGuard>
        ),
      },
    ],
  },
]);
