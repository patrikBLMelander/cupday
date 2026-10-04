import { useTranslation } from 'react-i18next';

const OWNER_NAME = 'Patrik Melander';
const OWNER_EMAIL = 'patrikblmelander@gmail.com';
const SECTIONS = ['what', 'who', 'why', 'howLong', 'browser'] as const;

/** Plain-language privacy notice for the practice-match board (GDPR transparency). */
export function PracticeMatchPrivacyPage(): JSX.Element {
  const { t } = useTranslation();
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold">{t('practice.privacy.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('practice.privacy.intro', { name: OWNER_NAME })}</p>
      </header>
      {SECTIONS.map((section) => (
        <section key={section}>
          <h2 className="mb-1.5 font-display text-lg font-bold">{t(`practice.privacy.${section}Title`)}</h2>
          <p className="leading-relaxed text-muted-foreground">{t(`practice.privacy.${section}Body`)}</p>
        </section>
      ))}
      <section>
        <h2 className="mb-1.5 font-display text-lg font-bold">{t('practice.privacy.removeTitle')}</h2>
        <p className="leading-relaxed text-muted-foreground">
          {t('practice.privacy.removeBody', { name: OWNER_NAME, email: OWNER_EMAIL })}{' '}
          <a href={`mailto:${OWNER_EMAIL}`} className="font-semibold text-accent-foreground underline">
            {OWNER_EMAIL}
          </a>
        </p>
      </section>
    </article>
  );
}
