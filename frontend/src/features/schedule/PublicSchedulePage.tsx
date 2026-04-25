import { useTranslation } from 'react-i18next';
import { Link, useOutletContext } from 'react-router-dom';

import type { PublicCupOutletContext } from '@/app/layouts/PublicLayout';
import { Button } from '@/components/ui/button';
import { PublicScheduleView } from '@/features/schedule/PublicScheduleView';

export function PublicSchedulePage(): JSX.Element {
  const { t } = useTranslation();
  const { cup } = useOutletContext<PublicCupOutletContext>();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
        <Link to={`/c/${cup.slug}`}>← {t('public.schedule.backToCup')}</Link>
      </Button>
      <h1 className="text-2xl font-semibold tracking-tight">
        {t('public.tabs.schedule')}
      </h1>
      <PublicScheduleView cupId={cup.id} />
    </div>
  );
}
