import { useTranslation } from 'react-i18next';

import type { SlotQuota } from '@/features/cups/cupTypes';
import { quotasByClass } from '@/features/postedCups/postedCupFormat';

function Bar({ label, maxTeams, remaining, strong }: { label: string; maxTeams: number; remaining: number; strong?: boolean }): JSX.Element {
  const { t } = useTranslation();
  const taken = Math.round(((maxTeams - remaining) / Math.max(1, maxTeams)) * 100);
  return (
    <div>
      <div className={strong ? 'flex justify-between font-bold' : 'flex justify-between text-sm font-semibold'}>
        <span>{label}</span>
        <span>{remaining > 0 ? t('public.info.levelRemaining', { remaining, max: maxTeams }) : t('public.info.levelFull')}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${taken}%` }} />
      </div>
    </div>
  );
}

/** Free slots per class and/or level on the public cup page. */
export function SlotQuotaBars({ quotas }: { quotas: SlotQuota[] }): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      {quotasByClass(quotas).map((group) => (
        <div key={group.ageClass || 'all'} className="flex flex-col gap-2">
          {group.ageClass && <Bar label={group.ageClass} maxTeams={group.maxTeams} remaining={group.remaining} strong />}
          {group.rows
            .filter((row) => row.level !== '')
            .map((row) => (
              <div key={row.level} className={group.ageClass ? 'pl-4' : undefined}>
                <Bar label={row.level} maxTeams={row.maxTeams} remaining={row.remaining} />
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
