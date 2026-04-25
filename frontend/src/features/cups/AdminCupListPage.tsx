import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CupStatusBadge } from '@/features/cups/CupStatusBadge';
import { useListCupsQuery } from '@/features/cups/cupsApi';

export function AdminCupListPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { data: cups, isLoading, isError } = useListCupsQuery();

  const dateFormatter = new Intl.DateTimeFormat(
    i18n.resolvedLanguage ?? 'sv',
    { day: 'numeric', month: 'short', year: 'numeric' },
  );

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('admin.cups.title')}
        </h1>
        <Button asChild>
          <Link to="/admin/cups/new">{t('admin.cups.createCta')}</Link>
        </Button>
      </header>

      {isLoading && (
        <p role="status" aria-live="polite" className="text-muted-foreground">
          {t('common.loading')}
        </p>
      )}

      {isError && (
        <p role="alert" className="text-sm text-destructive">
          {t('admin.cups.loadFailed')}
        </p>
      )}

      {cups && cups.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-muted-foreground">{t('admin.cups.emptyState')}</p>
            <Button asChild>
              <Link to="/admin/cups/new">{t('admin.cups.createCta')}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {cups && cups.length > 0 && (
        <ul className="flex flex-col gap-2">
          {cups.map((cup) => (
            <li key={cup.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-medium">{cup.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {dateFormatter.format(new Date(cup.startDate))}
                      {' – '}
                      {dateFormatter.format(new Date(cup.endDate))}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <CupStatusBadge
                      status={cup.status}
                      label={t(`admin.cupStatus.${cup.status}`)}
                    />
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/admin/cups/${cup.id}`}>
                        {t('admin.cups.edit')}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
