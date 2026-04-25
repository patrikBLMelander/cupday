import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/store';
import { useLoginMutation } from '@/features/auth/authApi';
import { selectAuthToken, tokenSet } from '@/features/auth/authSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const EMAIL_RE = /^.+@.+\..+$/;
const MIN_PASSWORD_LEN = 6;

type LocationState = { from?: string } | null;

function isValid(email: string, password: string): boolean {
  return EMAIL_RE.test(email.trim()) && password.length >= MIN_PASSWORD_LEN;
}

export function LoginPage(): JSX.Element {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const token = useAppSelector(selectAuthToken);
  const [login, { isLoading }] = useLoginMutation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const from = (location.state as LocationState)?.from ?? '/admin';

  useEffect(() => {
    if (token) navigate(from, { replace: true });
  }, [token, from, navigate]);

  if (token) {
    return <Navigate to={from} replace />;
  }

  const canSubmit = isValid(email, password) && !isLoading;

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canSubmit) return;
    setErrorKey(null);
    try {
      const result = await login({ email: email.trim(), password }).unwrap();
      dispatch(tokenSet(result.token));
      navigate(from, { replace: true });
    } catch (err) {
      const status = (err as { status?: number }).status;
      setErrorKey(status === 401 ? 'auth.invalidCredentials' : 'auth.loginFailed');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>{t('app.title')}</CardTitle>
          <LanguageSwitcher />
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-email">{t('auth.email')}</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-password">{t('auth.password')}</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {errorKey && (
              <p role="alert" className="text-sm text-destructive">
                {t(errorKey)}
              </p>
            )}
            <Button type="submit" disabled={!canSubmit}>
              {t('auth.signIn')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
