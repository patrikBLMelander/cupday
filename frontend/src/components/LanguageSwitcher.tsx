import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

const LANGUAGES = ['sv', 'en'] as const;
type Lang = (typeof LANGUAGES)[number];

const LABEL_KEY: Record<Lang, string> = {
  sv: 'common.languageSwedish',
  en: 'common.languageEnglish',
};

export function LanguageSwitcher(): JSX.Element {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage ?? i18n.language).split('-')[0] as Lang;

  return (
    <nav aria-label={t('common.languageSwedish') + ' / ' + t('common.languageEnglish')}>
      <div className="inline-flex gap-1">
        {LANGUAGES.map((lang) => {
          const isActive = current === lang;
          return (
            <Button
              key={lang}
              type="button"
              size="sm"
              variant={isActive ? 'default' : 'outline'}
              aria-pressed={isActive}
              aria-label={t(LABEL_KEY[lang])}
              onClick={() => void i18n.changeLanguage(lang)}
            >
              {lang.toUpperCase()}
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
