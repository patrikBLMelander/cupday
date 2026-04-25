import { useTranslation } from 'react-i18next';
import { Link, useOutletContext, useParams } from 'react-router-dom';

import type { PublicCupOutletContext } from '@/app/layouts/PublicLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetRegistrationQuery } from '@/features/teams/teamsApi';

export function PaymentPage(): JSX.Element {
  const { t } = useTranslation();
  const { cup } = useOutletContext<PublicCupOutletContext>();
  const { registrationId = '' } = useParams<{ registrationId: string }>();
  const {
    data,
    isLoading,
    isError,
    error,
  } = useGetRegistrationQuery(registrationId, { skip: !registrationId });

  if (isLoading) {
    return (
      <p role="status" aria-live="polite" className="text-muted-foreground">
        {t('common.loading')}
      </p>
    );
  }

  const status = (error as { status?: number } | undefined)?.status;
  if (isError || !data || status === 404) {
    return <NotFoundPanel cupSlug={cup.slug} t={t} />;
  }

  const { teams } = data;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('payment.title')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('payment.subtitle')}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('payment.teamsCard.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2">
            {teams.map((team) => (
              <li
                key={team.id}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-sm font-medium">{team.name}</span>
                <Badge variant="secondary">
                  {t('payment.teamsCard.statusReserved')}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('payment.paymentCard.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm">
            <span className="font-medium">{t('payment.paymentCard.fee')}: </span>
            {`${cup.registrationFeeSek} SEK`}
          </p>
          {cup.paymentInstructions && (
            <p className="whitespace-pre-wrap text-sm">
              {cup.paymentInstructions}
            </p>
          )}
          {cup.paymentLagkassanQrUrl && (
            <img
              src={cup.paymentLagkassanQrUrl}
              alt={t('payment.paymentCard.qrAlt')}
              className="max-w-48 self-start rounded border border-border sm:max-w-56"
            />
          )}
          {cup.paymentLagkassanLink && (
            <Button asChild className="self-start">
              <a
                href={cup.paymentLagkassanLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('payment.paymentCard.openLagkassan')}
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('payment.cancelCard.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p>{t('payment.cancelCard.body')}</p>
          <p className="font-medium">{cup.organizerContactName}</p>
          {cup.organizerContactEmail && (
            <p>
              <span className="text-muted-foreground">
                {t('payment.cancelCard.contactEmail')}:{' '}
              </span>
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
              <span className="text-muted-foreground">
                {t('payment.cancelCard.contactPhone')}:{' '}
              </span>
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

      <Button asChild variant="ghost" className="self-start">
        <Link to={`/c/${cup.slug}`}>{t('payment.backToCup')}</Link>
      </Button>
    </div>
  );
}

function NotFoundPanel({
  cupSlug,
  t,
}: {
  cupSlug: string;
  t: (key: string) => string;
}): JSX.Element {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 text-center">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10">
          <h1 className="text-xl font-semibold tracking-tight">
            {t('payment.notFound.title')}
          </h1>
          <p className="text-muted-foreground">{t('payment.notFound.body')}</p>
          <Button asChild variant="outline">
            <Link to={`/c/${cupSlug}`}>{t('payment.backToCup')}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
