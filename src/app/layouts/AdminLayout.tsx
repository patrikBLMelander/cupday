import { useTranslation } from 'react-i18next';
import { Link, Outlet, useNavigate } from 'react-router-dom';

import { useAppDispatch } from '@/app/store';
import { useLogoutMutation } from '@/features/auth/authApi';
import { tokenCleared } from '@/features/auth/authSlice';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export function AdminLayout(): JSX.Element {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [logout, { isLoading }] = useLogoutMutation();

  async function handleLogout(): Promise<void> {
    try {
      await logout().unwrap();
    } catch {
      // Even if the server call fails we still clear the local session.
    }
    dispatch(tokenCleared());
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-4 py-3 sm:px-6">
        <Link
          to="/admin"
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          {t('app.title')}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <LanguageSwitcher />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleLogout()}
            disabled={isLoading}
          >
            {t('auth.logout')}
          </Button>
        </div>
      </header>
      <main className="flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
