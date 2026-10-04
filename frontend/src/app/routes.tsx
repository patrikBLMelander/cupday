import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AdminLayout } from '@/app/layouts/AdminLayout';
import { PublicLayout } from '@/app/layouts/PublicLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { AdminCupListPage } from '@/features/cups/AdminCupListPage';
import { AdminCupSettingsPage } from '@/features/cups/AdminCupSettingsPage';
import { PublicCupLandingPage } from '@/features/cups/PublicCupLandingPage';
import { PublicLandingPage } from '@/features/cups/PublicLandingPage';
import { AdminPracticeMatchesPage } from '@/features/practiceMatches/AdminPracticeMatchesPage';
import { PostedCupFormPage } from '@/features/postedCups/PostedCupFormPage';
import { PostedCupManagePage } from '@/features/postedCups/PostedCupManagePage';
import { SaveCupLinkPage } from '@/features/postedCups/SaveCupLinkPage';
import { PracticeLayout } from '@/features/practiceMatches/PracticeLayout';
import { PracticeMatchDetailPage } from '@/features/practiceMatches/PracticeMatchDetailPage';
import { PracticeMatchFormPage } from '@/features/practiceMatches/PracticeMatchFormPage';
import { PracticeMatchListPage } from '@/features/practiceMatches/PracticeMatchListPage';
import { PracticeMatchManagePage } from '@/features/practiceMatches/PracticeMatchManagePage';
import { PracticeMatchPrivacyPage } from '@/features/practiceMatches/PracticeMatchPrivacyPage';
import { AdminSchedulePage } from '@/features/schedule/AdminSchedulePage';
import { PublicSchedulePage } from '@/features/schedule/PublicSchedulePage';
import { AdminTeamsPage } from '@/features/teams/AdminTeamsPage';
import { PaymentPage } from '@/features/teams/PaymentPage';
import { RegistrationFormPage } from '@/features/teams/RegistrationFormPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLandingPage />,
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
          { path: 'traningsmatcher', element: <AdminPracticeMatchesPage /> },
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
    path: '/matcher',
    element: <PracticeLayout />,
    children: [
      { index: true, element: <PracticeMatchListPage /> },
      { path: 'ny', element: <PracticeMatchFormPage /> },
      { path: 'integritet', element: <PracticeMatchPrivacyPage /> },
      { path: 'ny-cup', element: <PostedCupFormPage /> },
      { path: 'cup/:id/spara-lank', element: <SaveCupLinkPage /> },
      { path: 'cup/:id/hantera', element: <PostedCupManagePage /> },
      { path: 'cup/:id/redigera', element: <PostedCupFormPage /> },
      { path: ':id', element: <PracticeMatchDetailPage /> },
      { path: ':id/hantera', element: <PracticeMatchManagePage /> },
      { path: ':id/redigera', element: <PracticeMatchFormPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
