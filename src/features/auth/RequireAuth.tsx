import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAppDispatch } from '@/app/store';
import { useGetMeQuery } from '@/features/auth/authApi';
import { tokenCleared } from '@/features/auth/authSlice';

export function RequireAuth(): JSX.Element {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { isLoading, isError, error } = useGetMeQuery();

  const isUnauthorized =
    isError && (error as { status?: number } | undefined)?.status === 401;

  useEffect(() => {
    if (isUnauthorized) dispatch(tokenCleared());
  }, [isUnauthorized, dispatch]);

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-screen items-center justify-center"
      >
        <span className="sr-only">{t('common.loading')}</span>
        <div
          aria-hidden="true"
          className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary"
        />
      </div>
    );
  }

  if (isUnauthorized) {
    return (
      <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
    );
  }

  return <Outlet />;
}
