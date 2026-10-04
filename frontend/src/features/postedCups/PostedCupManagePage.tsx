import { ExternalLink, KeyRound, Mail, Phone, Trophy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import type { Cup } from '@/features/cups/cupTypes';
import { AdminLinkActions } from '@/features/postedCups/AdminLinkActions';
import { removeCupToken, resolveCupToken } from '@/features/postedCups/cupTokens';
import { formatCupTimes, formatDateSpan } from '@/features/postedCups/postedCupFormat';
import {
  useDeletePostedCupMutation,
  useGetManagedCupQuery,
  useSetPostedCupTeamStatusMutation,
} from '@/features/postedCups/postedCupsApi';
import { asProblem } from '@/features/practiceMatches/practiceMatchErrors';
import { ShareCard } from '@/features/share/ShareButtons';
import { cupShare } from '@/features/share/shareText';
import type { Team } from '@/features/teams/teamTypes';
import { cn } from '@/lib/cn';

type TeamFilter = 'all' | 'unpaid';

/** Organizer admin for a posted cup at `/matcher/cup/:id/hantera` — authorized by the admin link. */
export function PostedCupManagePage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'sv';
  const { id = '' } = useParams();
  const location = useLocation();
  const [token] = useState(() => resolveCupToken(id, location.hash));
  const [filter, setFilter] = useState<TeamFilter>('all');
  const { data, error, isLoading } = useGetManagedCupQuery({ id, token: token ?? '' }, { skip: !token });

  if (!token || asProblem(error).status === 403) return <p role="alert">{t('postedCup.manage.invalidLink')}</p>;
  if (isLoading) {
    return (
      <p role="status" aria-live="polite" className="text-muted-foreground">
        {t('common.loading')}
      </p>
    );
  }
  if (!data) return <p role="alert">{t('postedCup.manage.notFound')}</p>;

  const { cup, teams } = data;
  const active = teams.filter((team) => team.status !== 'cancelled');
  const paid = active.filter((team) => team.status === 'paid').length;
  const unpaid = active.length - paid;
  const visible = filter === 'unpaid' ? active.filter((team) => team.status !== 'paid') : active;
  const groups = groupByLevel(cup, visible);
  const cancelled = teams.filter((team) => team.status === 'cancelled');

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <header>
        <p className="inline-flex items-center gap-1.5 text-sm font-extrabold uppercase tracking-wide text-amber-800 dark:text-amber-400">
          <Trophy className="h-4 w-4" aria-hidden="true" />
          {t('postedCup.manage.kicker')}
        </p>
        <h1 className="font-display text-3xl font-extrabold">{cup.name}</h1>
        <p className="text-muted-foreground">
          {formatDateSpan(cup.startDate, cup.endDate, locale)} · {formatCupTimes(cup.startTime, cup.endTime)} · {cup.venueName}
        </p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <Stat value={`${active.length}`} suffix={`/${cup.maxTeams}`} label={t('postedCup.manage.registered')} />
        <Stat value={`${paid}`} label={t('postedCup.manage.paid')} tone="good" />
        <Stat value={`${unpaid}`} label={t('postedCup.manage.unpaid')} tone="warn" />
      </div>

      <ShareCard content={cupShare(t, cup, locale)} title={t('share.cupCardTitle')} body={t('share.cupCardBody')} />

      <div role="group" aria-label={t('postedCup.manage.filter')} className="flex gap-2">
        {(['all', 'unpaid'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={cn(
              'min-h-11 rounded-full px-4 font-bold',
              filter === value ? 'bg-foreground text-background' : 'border border-input bg-card',
            )}
          >
            {value === 'all' ? t('postedCup.manage.filterAll') : t('postedCup.manage.filterUnpaid', { count: unpaid })}
          </button>
        ))}
      </div>

      {cup.externalRegistrationUrl && (
        <p className="rounded-2xl border border-border bg-card p-4 text-sm">{t('postedCup.manage.externalNote')}</p>
      )}

      {active.length === 0 && !cup.externalRegistrationUrl && (
        <p className="rounded-2xl border border-dashed border-input p-6 text-center text-muted-foreground">{t('postedCup.manage.noTeams')}</p>
      )}

      {groups.map((group) => (
        <section key={group.title || 'all'} aria-label={group.title || t('postedCup.manage.teams')}>
          <h2 className="mb-2 font-display text-lg font-bold">
            {group.title || t('postedCup.manage.teams')}{' '}
            {group.capacity !== null && (
              <span className="font-sans text-sm font-semibold text-muted-foreground">
                {t('postedCup.manage.levelCount', { count: group.registered, max: group.capacity })}
              </span>
            )}
          </h2>
          <ul className="overflow-hidden rounded-2xl border border-border bg-card">
            {group.teams.map((team) => (
              <TeamRow key={team.id} cupId={cup.id} token={token} team={team} />
            ))}
          </ul>
        </section>
      ))}

      {cancelled.length > 0 && filter === 'all' && (
        <section aria-label={t('postedCup.manage.cancelledTeams')}>
          <h2 className="mb-2 font-display text-lg font-bold text-muted-foreground">{t('postedCup.manage.cancelledTeams')}</h2>
          <ul className="rounded-2xl border border-border bg-card opacity-60">
            {cancelled.map((team) => (
              <li key={team.id} className="border-t border-border px-4 py-3 first:border-t-0">
                {team.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-1.5 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold">{t('postedCup.manage.paymentInfo')}</h2>
          <Link to={`/matcher/cup/${cup.id}/redigera`} className="inline-flex min-h-11 items-center font-bold text-accent-foreground hover:underline">
            {t('postedCup.manage.change')}
          </Link>
        </div>
        {!cup.paymentLagkassanLink && !cup.paymentInstructions && (
          <p className="text-sm text-muted-foreground">{t('postedCup.manage.noPaymentInfo')}</p>
        )}
        {cup.paymentLagkassanLink && <p className="truncate text-sm text-muted-foreground">{cup.paymentLagkassanLink}</p>}
        {cup.paymentInstructions && <p className="whitespace-pre-line text-sm text-muted-foreground">{cup.paymentInstructions}</p>}
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Link to={`/matcher/cup/${cup.id}/redigera`} className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-input bg-card font-bold hover:bg-muted">
          {t('postedCup.manage.edit')}
        </Link>
        <Link to={`/c/${cup.slug}`} className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-2xl bg-primary font-bold text-primary-foreground hover:bg-primary/90">
          {t('postedCup.manage.viewPublic')}
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <section aria-labelledby="keep-link-title" className="rounded-2xl border border-primary bg-card p-4">
        <h2 id="keep-link-title" className="mb-1 inline-flex items-center gap-2 font-display text-lg font-bold">
          <KeyRound className="h-5 w-5" aria-hidden="true" />
          {t('postedCup.manage.keepLinkTitle')}
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">{t('postedCup.manage.keepLinkBody')}</p>
        <AdminLinkActions cup={cup} token={token} />
      </section>

      <DeleteCup cupId={cup.id} token={token} />
    </div>
  );
}

interface TeamGroup {
  title: string;
  teams: Team[];
  registered: number;
  capacity: number | null;
}

/** Teams grouped the way slots are locked: per class, per level, or per class + level. */
function groupByLevel(cup: Cup, teams: Team[]): TeamGroup[] {
  const quotas = cup.slotQuotas ?? [];
  if (quotas.length === 0) {
    return teams.length > 0 ? [{ title: '', teams, registered: teams.length, capacity: null }] : [];
  }
  return quotas
    .map((quota) => {
      const inSlot = teams.filter(
        (team) =>
          (quota.ageClass === '' || team.ageClass?.toLowerCase() === quota.ageClass.toLowerCase()) &&
          (quota.level === '' || team.level?.toLowerCase() === quota.level.toLowerCase()),
      );
      return {
        title: [quota.ageClass, quota.level].filter(Boolean).join(' · '),
        teams: inSlot,
        registered: quota.maxTeams - quota.remaining,
        capacity: quota.maxTeams,
      };
    })
    .filter((group) => group.teams.length > 0);
}

function Stat({ value, suffix, label, tone }: { value: string; suffix?: string; label: string; tone?: 'good' | 'warn' }): JSX.Element {
  return (
    <div
      className={cn(
        'rounded-2xl border p-3',
        tone === 'good' && 'border-primary bg-accent text-accent-foreground',
        tone === 'warn' && 'border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
        !tone && 'border-border bg-card',
      )}
    >
      <div className="font-display text-2xl font-extrabold">
        {value}
        {suffix && <span className="text-base text-muted-foreground">{suffix}</span>}
      </div>
      <div className="text-xs font-semibold">{label}</div>
    </div>
  );
}

function TeamRow({ cupId, token, team }: { cupId: string; token: string; team: Team }): JSX.Element {
  const { t } = useTranslation();
  const [setStatus, { isLoading }] = useSetPostedCupTeamStatusMutation();
  const isPaid = team.status === 'paid';

  return (
    <li className="flex items-center gap-3 border-t border-border px-4 py-3 first:border-t-0">
      <div className="min-w-0 flex-1">
        <div className="font-bold">{team.name}</div>
        <div className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
          <span>{team.contactName}</span>
          <a href={`tel:${team.contactPhone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 hover:underline">
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            {team.contactPhone}
          </a>
          <a href={`mailto:${team.contactEmail}`} className="inline-flex items-center gap-1 hover:underline">
            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
            {team.contactEmail}
          </a>
        </div>
      </div>
      <span className={cn('text-xs font-bold', isPaid ? 'text-accent-foreground' : 'text-amber-800 dark:text-amber-400')}>
        {isPaid ? t('postedCup.manage.statusPaid') : t('postedCup.manage.statusUnpaid')}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={isPaid}
        aria-label={t('postedCup.manage.markPaid', { team: team.name })}
        disabled={isLoading}
        onClick={() => void setStatus({ id: cupId, token, teamId: team.id, status: isPaid ? 'reserved' : 'paid' })}
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isPaid ? 'bg-primary' : 'bg-input',
        )}
      >
        <span
          aria-hidden="true"
          className={cn('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left]', isPaid ? 'left-[22px]' : 'left-0.5')}
        />
      </button>
    </li>
  );
}

function DeleteCup({ cupId, token }: { cupId: string; token: string }): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [deleteCup, { isLoading }] = useDeletePostedCupMutation();

  async function remove(): Promise<void> {
    await deleteCup({ id: cupId, token }).unwrap();
    removeCupToken(cupId);
    navigate('/matcher');
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="min-h-11 self-start rounded-full border border-destructive/50 px-4 font-bold text-destructive hover:bg-destructive/10"
      >
        {t('postedCup.manage.delete')}
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-destructive/40 p-4">
      <p className="text-sm font-semibold">{t('postedCup.manage.deleteHint')}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isLoading}
          onClick={() => void remove()}
          className="min-h-11 rounded-full bg-destructive px-4 font-bold text-destructive-foreground disabled:opacity-50"
        >
          {t('postedCup.manage.confirmDelete')}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="min-h-11 rounded-full border border-input px-4 font-bold hover:bg-muted">
          {t('postedCup.manage.keep')}
        </button>
      </div>
    </div>
  );
}
