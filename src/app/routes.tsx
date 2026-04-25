/* eslint-disable react-refresh/only-export-components */
import { useTranslation } from 'react-i18next';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import HomePlaceholder from '@/HomePlaceholder';
import { AdminLayout } from '@/app/layouts/AdminLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireAuth } from '@/features/auth/RequireAuth';

function AdminWelcome(): JSX.Element {
  const { t } = useTranslation();
  return (
    <h1 className="text-2xl font-semibold tracking-tight">
      {t('admin.welcome')}
    </h1>
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
        children: [{ index: true, element: <AdminWelcome /> }],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
