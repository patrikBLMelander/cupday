import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useOutletContext } from 'react-router-dom';

import type { PublicCupOutletContext } from '@/app/layouts/PublicLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function PublicCupLandingPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { cup } = useOutletContext<PublicCupOutletContext>();

  const dateFormatter = new Intl.DateTimeFormat(
    i18n.resolvedLanguage ?? 'sv',
    { day: 'numeric', month: 'short', year: 'numeric' },
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">{t('public.tabs.info')}</TabsTrigger>
          <TabsTrigger value="teams">{t('public.tabs.teams')}</TabsTrigger>
          <TabsTrigger value="schedule">{t('public.tabs.schedule')}</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{cup.name}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <InfoRow label={t('public.info.dates')}>
                {dateFormatter.format(new Date(cup.startDate))}
                {' – '}
                {dateFormatter.format(new Date(cup.endDate))}
              </InfoRow>
              <InfoRow label={t('public.info.venue')}>{cup.venueName}</InfoRow>
              <InfoRow label={t('public.info.fee')}>
                {`${cup.registrationFeeSek} SEK`}
              </InfoRow>
              <InfoRow label={t('public.info.organizer')}>
                {cup.organizingClubName}
              </InfoRow>
            </CardContent>
          </Card>

          {cup.paymentInstructions && (
            <Card>
              <CardHeader>
                <CardTitle>{t('public.info.paymentInstructions')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">
                  {cup.paymentInstructions}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t('public.info.contactName')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              <p>{cup.organizerContactName}</p>
              {cup.organizerContactEmail && (
                <p>
                  <a
                    href={`mailto:${cup.organizerContactEmail}`}
                    className="underline"
                  >
                    {cup.organizerContactEmail}
                  </a>
                </p>
              )}
              {cup.organizerContactPhone && (
                <p>
                  <a
                    href={`tel:${cup.organizerContactPhone}`}
                    className="underline"
                  >
                    {cup.organizerContactPhone}
                  </a>
                </p>
              )}
            </CardContent>
          </Card>

          {cup.status === 'open' ? (
            <Button asChild size="lg" className="self-start">
              <Link to={`/c/${cup.slug}/register`}>
                {t('public.info.registerCta')}
              </Link>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('public.info.registrationsClosed')}
            </p>
          )}
        </TabsContent>

        <TabsContent value="teams">
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {t('public.empty.teams')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {t('public.empty.schedule')}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </span>
      <span className="text-sm">{children}</span>
    </div>
  );
}
