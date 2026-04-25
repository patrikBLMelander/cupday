import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function CupNotFoundPage(): JSX.Element {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        {t('public.notFound.title')}
      </h1>
      <p className="text-muted-foreground">{t('public.notFound.body')}</p>
      <Link to="/" className="text-sm underline">
        {t('public.notFound.backHome')}
      </Link>
    </main>
  );
}
