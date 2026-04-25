import { createBrowserRouter, Navigate } from 'react-router-dom';

import HomePlaceholder from '@/HomePlaceholder';
import { AdminLayout } from '@/app/layouts/AdminLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { AdminCupListPage } from '@/features/cups/AdminCupListPage';
import { AdminCupSettingsPage } from '@/features/cups/AdminCupSettingsPage';

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
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
