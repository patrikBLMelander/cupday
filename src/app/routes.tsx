import { createBrowserRouter, Navigate } from 'react-router-dom';

import HomePlaceholder from '@/HomePlaceholder';
import { AdminLayout } from '@/app/layouts/AdminLayout';
import { PublicLayout } from '@/app/layouts/PublicLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { AdminCupListPage } from '@/features/cups/AdminCupListPage';
import { AdminCupSettingsPage } from '@/features/cups/AdminCupSettingsPage';
import { PublicCupLandingPage } from '@/features/cups/PublicCupLandingPage';
import { AdminSchedulePage } from '@/features/schedule/AdminSchedulePage';
import { PublicSchedulePage } from '@/features/schedule/PublicSchedulePage';
import { AdminTeamsPage } from '@/features/teams/AdminTeamsPage';
import { PaymentPage } from '@/features/teams/PaymentPage';
import { RegistrationFormPage } from '@/features/teams/RegistrationFormPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePlaceholder />,
  },
  {
    path: '/admin/login',
    element: <LoginPage />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminCupListPage /> },
          { path: 'cups/new', element: <AdminCupSettingsPage /> },
          { path: 'cups/:id', element: <AdminCupSettingsPage /> },
          { path: 'cups/:id/teams', element: <AdminTeamsPage /> },
          { path: 'cups/:id/schedule', element: <AdminSchedulePage /> },
        ],
      },
    ],
  },
  {
    path: '/c/:slug',
    element: <PublicLayout />,
    children: [
      { index: true, element: <PublicCupLandingPage /> },
      { path: 'register', element: <RegistrationFormPage /> },
      { path: 'payment/:registrationId', element: <PaymentPage /> },
      { path: 'schedule', element: <PublicSchedulePage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
