/* eslint-disable react-refresh/only-export-components */
import { useTranslation } from 'react-i18next';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import HomePlaceholder from '@/HomePlaceholder';
import { AdminLayout } from '@/app/layouts/AdminLayout';
import { PublicLayout } from '@/app/layouts/PublicLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { AdminCupListPage } from '@/features/cups/AdminCupListPage';
import { AdminCupSettingsPage } from '@/features/cups/AdminCupSettingsPage';
import { PublicCupLandingPage } from '@/features/cups/PublicCupLandingPage';

function ComingSoon(): JSX.Element {
  const { t } = useTranslation();
  return (
    <p className="py-10 text-center text-muted-foreground">
      {t('public.placeholder.comingSoon')}
    </p>
  );
}

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
        ],
      },
    ],
  },
  {
    path: '/c/:slug',
    element: <PublicLayout />,
    children: [
      { index: true, element: <PublicCupLandingPage /> },
      { path: 'register', element: <ComingSoon /> },
      { path: 'payment/:registrationId', element: <ComingSoon /> },
      { path: 'schedule', element: <ComingSoon /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
