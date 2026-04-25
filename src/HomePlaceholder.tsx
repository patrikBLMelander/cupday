import { useTranslation } from 'react-i18next';

export default function HomePlaceholder(): JSX.Element {
  const { t, i18n } = useTranslation();

  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">{t('app.title')}</h1>
      <p className="text-muted-foreground">{t('app.tagline')}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void i18n.changeLanguage('sv')}
          className="rounded border border-border px-3 py-1 text-sm"
        >
          SV
        </button>
        <button
          type="button"
          onClick={() => void i18n.changeLanguage('en')}
          className="rounded border border-border px-3 py-1 text-sm"
        >
          EN
        </button>
      </div>
    </main>
  );
}
