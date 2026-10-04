import { KeyRound, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { AdminLinkActions } from '@/features/postedCups/AdminLinkActions';
import { getCupToken } from '@/features/postedCups/cupTokens';
import { useGetManagedCupQuery } from '@/features/postedCups/postedCupsApi';
import { cn } from '@/lib/cn';

/**
 * Mandatory step right after posting a cup. The admin link is the only way back to marking teams
 * paid, so the organizer must mail, share, copy or explicitly confirm before continuing.
 */
export function SaveCupLinkPage(): JSX.Element {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const token = getCupToken(id);
  const [saved, setSaved] = useState(false);
  const { data, isError } = useGetManagedCupQuery({ id, token: token ?? '' }, { skip: !token });

  if (!token || isError) {
    return <p role="alert">{t('postedCup.manage.invalidLink')}</p>;
  }
  if (!data) {
    return (
      <p role="status" aria-live="polite" className="text-muted-foreground">
        {t('common.loading')}
      </p>
    );
  }

  const uses = [t('postedCup.link.useTeams'), t('postedCup.link.usePaid'), t('postedCup.link.useEdit')];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <p role="status" className="inline-flex items-center gap-2 self-start rounded-full bg-accent px-4 py-2 font-bold text-accent-foreground">
        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        {t('postedCup.link.published', { name: data.cup.name })}
      </p>

      <section aria-labelledby="save-link-title" className="rounded-3xl border-2 border-primary bg-card p-6 shadow-lg">
        <div className="flex items-start gap-4">
          <span aria-hidden="true" className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <KeyRound className="h-7 w-7" />
          </span>
          <div>
            <p className="text-sm font-extrabold uppercase tracking-wide text-accent-foreground">{t('postedCup.link.step')}</p>
            <h1 id="save-link-title" className="font-display text-3xl font-extrabold leading-tight">
              {t('postedCup.link.title')}
            </h1>
          </div>
        </div>
        <p className="mt-4 text-lg font-semibold">{t('postedCup.link.why')}</p>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-6">
          {uses.map((use) => (
            <li key={use}>{use}</li>
          ))}
        </ul>
        <p className="mt-3 rounded-xl bg-accent p-3 text-sm font-semibold">{t('postedCup.link.noAccount')}</p>

        <div className="mt-5">
          <AdminLinkActions cup={data.cup} token={token} onSaved={() => setSaved(true)} />
        </div>

        <label className="mt-4 flex items-start gap-3">
          <input
            type="checkbox"
            checked={saved}
            onChange={(e) => setSaved(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[hsl(var(--primary))]"
          />
          <span className="font-semibold">{t('postedCup.link.confirm')}</span>
        </label>

        <button
          type="button"
          disabled={!saved}
          onClick={() => navigate(`/matcher/cup/${id}/hantera`)}
          className={cn(
            'mt-5 min-h-14 w-full rounded-2xl text-lg font-bold',
            saved ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'cursor-not-allowed bg-muted text-muted-foreground',
          )}
        >
          {t('postedCup.link.continue')}
        </button>
        {!saved && <p className="mt-2 text-center text-sm text-muted-foreground">{t('postedCup.link.continueHint')}</p>}
      </section>

      <Link to={`/c/${data.cup.slug}`} className="inline-flex min-h-11 items-center self-start font-bold text-accent-foreground hover:underline">
        {t('postedCup.link.viewPublic')}
      </Link>
    </div>
  );
}
