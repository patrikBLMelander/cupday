import { Mail, Phone } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useParams } from 'react-router-dom';

import { ManageLinkNotice } from '@/features/practiceMatches/ManageLinkNotice';
import { ShareButtons, ShareCard } from '@/features/share/ShareButtons';
import { matchShare } from '@/features/share/shareText';
import { MatchSummary } from '@/features/practiceMatches/PracticeMatchDetailPage';
import { getMatchToken, saveMatchToken } from '@/features/practiceMatches/manageTokens';
import { asProblem } from '@/features/practiceMatches/practiceMatchErrors';
import {
  useCancelBookingMutation,
  useCancelPracticeMatchMutation,
  useGetManagedPracticeMatchQuery,
} from '@/features/practiceMatches/practiceMatchesApi';
import type { Booking } from '@/features/practiceMatches/practiceMatchTypes';
import { cn } from '@/lib/cn';

/** Reads the token from the link's #hash (and remembers it), falling back to this browser's storage. */
function resolveToken(matchId: string, hash: string): string | null {
  const fromHash = decodeURIComponent(hash.replace(/^#/, ''));
  if (fromHash) {
    saveMatchToken(matchId, fromHash);
    return fromHash;
  }
  return getMatchToken(matchId);
}

/** Organizer view at `/matcher/:id/hantera` — authorized by the secret manage token. */
export function PracticeMatchManagePage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { id = '' } = useParams();
  const location = useLocation();
  const [token] = useState(() => resolveToken(id, location.hash));
  const navState = location.state as { justCreated?: boolean; emailSent?: boolean } | null;
  const justCreated = navState?.justCreated === true;
  const emailSent = navState?.emailSent === true;
  const { data, error, isLoading } = useGetManagedPracticeMatchQuery({ id, token: token ?? '' }, { skip: !token });

  if (!token || asProblem(error).status === 403) {
    return <p role="alert">{t('practice.manage.invalidLink')}</p>;
  }
  if (isLoading) {
    return (
      <p role="status" aria-live="polite" className="text-muted-foreground">
        {t('common.loading')}
      </p>
    );
  }
  if (!data) {
    return <p role="alert">{t('practice.detail.notFound')}</p>;
  }

  const { match, bookings } = data;
  const isActive = match.status === 'active';

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      {justCreated && (
        <p role="status" className="rounded-2xl bg-accent p-4 font-display text-xl font-extrabold text-accent-foreground">
          {t('practice.manage.justCreated')}
        </p>
      )}

      <ManageLinkNotice match={match} token={token} emphasized={justCreated} emailSent={justCreated && emailSent} />

      {justCreated && isActive && (
        <ShareCard
          content={matchShare(t, match, i18n.resolvedLanguage ?? 'sv')}
          title={t('share.matchCardTitle')}
          body={t('share.matchCardBody')}
        />
      )}

      <MatchSummary match={match} />

      <div className="flex flex-wrap gap-2">
        <Link
          to={`/matcher/${match.id}`}
          className="inline-flex min-h-11 items-center rounded-full border border-input bg-card px-4 font-bold hover:bg-muted"
        >
          {t('practice.manage.viewPublic')}
        </Link>
        {isActive && !justCreated && <ShareButtons content={matchShare(t, match, i18n.resolvedLanguage ?? 'sv')} />}
        {isActive && (
          <Link
            to={`/matcher/${match.id}/redigera`}
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 font-bold text-primary-foreground hover:bg-primary/90"
          >
            {t('practice.manage.edit')}
          </Link>
        )}
      </div>

      <section aria-labelledby="bookings-title" className="flex flex-col gap-2">
        <h2 id="bookings-title" className="font-display text-xl font-bold">
          {t('practice.manage.bookings')}
        </h2>
        {bookings.length === 0 && <p className="text-muted-foreground">{t('practice.manage.noBookings')}</p>}
        <ul className="flex flex-col gap-2">
          {bookings.map((booking) => (
            <BookingItem key={booking.id} booking={booking} token={token} />
          ))}
        </ul>
      </section>

      {isActive ? (
        <CancelMatch matchId={match.id} token={token} />
      ) : (
        <p role="status" className="rounded-xl border border-destructive/40 p-4 font-semibold text-destructive">
          {t('practice.manage.cancelled')}
        </p>
      )}
    </div>
  );
}

function BookingItem({ booking, token }: { booking: Booking; token: string }): JSX.Element {
  const { t } = useTranslation();
  const [cancelBooking, { isLoading }] = useCancelBookingMutation();
  const isBooked = booking.status === 'booked';

  return (
    <li className={cn('rounded-2xl border border-border bg-card p-4', !isBooked && 'opacity-60')}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex-1 font-bold">{booking.teamName}</span>
        {!isBooked && <span className="text-sm font-semibold text-muted-foreground">{t('practice.manage.bookingCancelled')}</span>}
      </div>
      <div className="mt-1 text-sm">{booking.contactName}</div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <a href={`tel:${booking.contactPhone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 text-accent-foreground hover:underline">
          <Phone className="h-4 w-4" aria-hidden="true" />
          {booking.contactPhone}
        </a>
        <a href={`mailto:${booking.contactEmail}`} className="inline-flex items-center gap-1.5 text-accent-foreground hover:underline">
          <Mail className="h-4 w-4" aria-hidden="true" />
          {booking.contactEmail}
        </a>
      </div>
      {booking.message && <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{booking.message}</p>}
      {isBooked && (
        <button
          type="button"
          disabled={isLoading}
          onClick={() => void cancelBooking({ matchId: booking.matchId, bookingId: booking.id, token })}
          className="mt-3 min-h-11 rounded-full border border-input px-4 text-sm font-bold hover:bg-muted disabled:opacity-50"
        >
          {t('practice.manage.removeBooking')}
        </button>
      )}
    </li>
  );
}

function CancelMatch({ matchId, token }: { matchId: string; token: string }): JSX.Element {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const [cancelMatch, { isLoading }] = useCancelPracticeMatchMutation();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="min-h-11 self-start rounded-full border border-destructive/50 px-4 font-bold text-destructive hover:bg-destructive/10"
      >
        {t('practice.manage.cancelMatch')}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={isLoading}
        onClick={() => void cancelMatch({ id: matchId, token })}
        className="min-h-11 rounded-full bg-destructive px-4 font-bold text-destructive-foreground disabled:opacity-50"
      >
        {t('practice.manage.confirmCancel')}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="min-h-11 rounded-full border border-input px-4 font-bold hover:bg-muted"
      >
        {t('practice.manage.keep')}
      </button>
    </div>
  );
}
