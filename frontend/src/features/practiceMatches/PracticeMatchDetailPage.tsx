import { CalendarDays, ChevronLeft, Mail, MapPin, Phone } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { LevelMeter, SlotsStatus } from '@/features/practiceMatches/MatchBits';
import {
  bookingsForMatch,
  getMatchToken,
  readTeamQuery,
  removeBooking,
  saveBooking,
  type StoredBooking,
} from '@/features/practiceMatches/manageTokens';
import { asProblem } from '@/features/practiceMatches/practiceMatchErrors';
import {
  formatLabel,
  formatLongDate,
  formatTimeRange,
  levelRangeLabel,
  mapsUrl,
  matchAgeLabel,
} from '@/features/practiceMatches/practiceMatchFormat';
import {
  useBookPracticeMatchMutation,
  useCancelBookingMutation,
  useGetPracticeMatchQuery,
} from '@/features/practiceMatches/practiceMatchesApi';
import type { PracticeMatch } from '@/features/practiceMatches/practiceMatchTypes';
import { ConsentCheckbox, Field, inputClass } from '@/features/practiceMatches/FormField';
import { ShareButtons } from '@/features/share/ShareButtons';
import { matchShare } from '@/features/share/shareText';

const EMAIL_RE = /^.+@.+\..+$/;

export function PracticeMatchDetailPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { id = '' } = useParams();
  const { data: match, isLoading, isError } = useGetPracticeMatchQuery(id);
  const [myBookings, setMyBookings] = useState<StoredBooking[]>(() => bookingsForMatch(id));

  if (isLoading) {
    return (
      <p role="status" aria-live="polite" className="text-muted-foreground">
        {t('common.loading')}
      </p>
    );
  }
  if (isError || !match) {
    return <p role="alert">{t('practice.detail.notFound')}</p>;
  }

  const isOwner = getMatchToken(match.id) !== null;
  const isBookable =
    match.status === 'active' && match.freeSlots > 0 && new Date(match.kickoffAt).getTime() > Date.now();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <Link to="/matcher" className="inline-flex min-h-11 items-center gap-1 self-start font-semibold text-muted-foreground hover:underline">
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        {t('practice.detail.back')}
      </Link>

      <MatchSummary match={match} />

      {match.status === 'active' && (
        <section aria-labelledby="share-match-title">
          <h2 id="share-match-title" className="mb-2 font-display text-lg font-bold">
            {t('share.matchTitle')}
          </h2>
          <ShareButtons content={matchShare(t, match, i18n.resolvedLanguage ?? 'sv')} />
        </section>
      )}

      {match.status === 'cancelled' && (
        <p role="status" className="rounded-xl border border-destructive/40 p-4 font-semibold text-destructive">
          {t('practice.detail.cancelled')}
        </p>
      )}

      {isOwner && (
        <Link to={`/matcher/${match.id}/hantera`} className="inline-flex min-h-11 items-center self-start font-bold text-accent-foreground hover:underline">
          {t('practice.detail.manageLink')}
        </Link>
      )}

      {myBookings.map((booking) => (
        <MyBooking
          key={booking.bookingId}
          booking={booking}
          onCancelled={() => {
            removeBooking(booking.bookingId);
            setMyBookings(bookingsForMatch(id));
          }}
        />
      ))}

      {isBookable && (
        <BookingForm
          match={match}
          onBooked={(booking) => {
            saveBooking(booking);
            setMyBookings(bookingsForMatch(id));
          }}
        />
      )}
    </div>
  );
}

/** Match facts shared with the manage page. */
export function MatchSummary({ match }: { match: PracticeMatch }): JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'sv';

  return (
    <>
      <div>
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-muted px-2.5 py-1 text-sm font-bold">{matchAgeLabel(match)}</span>
          <span className="rounded-full bg-muted px-2.5 py-1 text-sm font-bold">{t(`practice.gender.${match.gender}`)}</span>
          <span className="rounded-full bg-muted px-2.5 py-1 text-sm font-bold">{formatLabel(t, match.playersPerSide)}</span>
        </div>
        <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">
          {t('practice.detail.title', { team: match.teamName })}
        </h1>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            {formatLongDate(match.kickoffAt, locale)}
          </div>
          <div className="font-display text-3xl font-extrabold">{formatTimeRange(match.kickoffAt, match.endsAt, locale)}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm font-semibold text-muted-foreground">{t('practice.detail.level')}</div>
          <div className="mt-1.5 flex items-center gap-2">
            <LevelMeter min={match.levelMin} max={match.levelMax} />
            <span className="font-display text-xl font-extrabold">{levelRangeLabel(t, match.levelMin, match.levelMax)}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card px-4">
        <div className="flex items-center gap-3 border-b border-border py-3">
          <MapPin className="h-5 w-5 shrink-0 text-accent-foreground" aria-hidden="true" />
          <div>
            <div className="font-bold">{match.venue}</div>
            <a href={mapsUrl(match.venue)} target="_blank" rel="noreferrer" className="text-sm font-semibold text-accent-foreground hover:underline">
              {t('practice.detail.openMap')}
            </a>
          </div>
        </div>
        <div className="py-3">
          <div className="mb-1 text-sm font-semibold text-muted-foreground">{t('practice.detail.slots')}</div>
          <SlotsStatus free={match.freeSlots} total={match.opponentSlots} />
          {match.bookedTeams.length > 0 && (
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t('practice.detail.bookedBy', { teams: match.bookedTeams.join(', ') })}
            </p>
          )}
        </div>
        {match.costSek !== null && (
          <div className="flex justify-between border-t border-border py-3">
            <span className="font-semibold">{t('practice.detail.cost')}</span>
            <span className="font-bold">
              {match.costSek === 0 ? t('practice.detail.free') : t('practice.detail.costValue', { cost: match.costSek })}
            </span>
          </div>
        )}
      </div>

      {match.notes && (
        <section>
          <h2 className="mb-1.5 font-display text-lg font-bold">{t('practice.detail.notes')}</h2>
          <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{match.notes}</p>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-display text-lg font-bold">{t('practice.detail.contact')}</h2>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="font-bold">{match.contactName}</div>
            <div className="truncate text-sm text-muted-foreground">
              {match.contactPhone} · {match.contactEmail}
            </div>
          </div>
          <a
            href={`tel:${match.contactPhone.replace(/\s/g, '')}`}
            aria-label={t('practice.detail.call', { name: match.contactName })}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground"
          >
            <Phone className="h-5 w-5" aria-hidden="true" />
          </a>
          <a
            href={`mailto:${match.contactEmail}`}
            aria-label={t('practice.detail.email', { name: match.contactName })}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground"
          >
            <Mail className="h-5 w-5" aria-hidden="true" />
          </a>
        </div>
      </section>
    </>
  );
}

function MyBooking({ booking, onCancelled }: { booking: StoredBooking; onCancelled: () => void }): JSX.Element {
  const { t } = useTranslation();
  const [cancelBooking, { isLoading }] = useCancelBookingMutation();
  const [failed, setFailed] = useState(false);

  async function cancel(): Promise<void> {
    setFailed(false);
    try {
      await cancelBooking({ matchId: booking.matchId, bookingId: booking.bookingId, token: booking.token }).unwrap();
      onCancelled();
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary bg-accent p-4">
      <span className="flex-1 font-bold">{t('practice.booking.yourBooking', { team: booking.teamName })}</span>
      <button
        type="button"
        onClick={cancel}
        disabled={isLoading}
        className="min-h-11 rounded-full border border-input bg-card px-4 font-bold disabled:opacity-50"
      >
        {t('practice.booking.cancel')}
      </button>
      {failed && (
        <p role="alert" className="w-full text-sm text-destructive">
          {t('practice.booking.genericError')}
        </p>
      )}
    </div>
  );
}

interface BookingFormShape {
  teamName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  message: string;
  acceptTerms: boolean;
  website: string;
}

function BookingForm({ match, onBooked }: { match: PracticeMatch; onBooked: (booking: StoredBooking) => void }): JSX.Element {
  const { t } = useTranslation();
  const [bookMatch, { isLoading }] = useBookPracticeMatchMutation();
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BookingFormShape>({
    defaultValues: { teamName: readTeamQuery(), contactName: '', contactPhone: '', contactEmail: '', message: '', acceptTerms: false, website: '' },
  });
  const required = { required: t('practice.form.errors.required'), validate: (v: string) => v.trim().length > 0 || t('practice.form.errors.required') };

  async function onSubmit(values: BookingFormShape): Promise<void> {
    setFormError(null);
    setSuccess(null);
    try {
      const result = await bookMatch({
        id: match.id,
        body: {
          teamName: values.teamName.trim(),
          contactName: values.contactName.trim(),
          contactPhone: values.contactPhone.trim(),
          contactEmail: values.contactEmail.trim(),
          message: values.message.trim() || null,
          acceptTerms: values.acceptTerms,
          website: values.website,
        },
      }).unwrap();
      onBooked({
        bookingId: result.booking.id,
        matchId: match.id,
        token: result.manageToken,
        teamName: result.booking.teamName,
      });
      setSuccess(t('practice.booking.success', { team: result.booking.teamName }));
      reset();
    } catch (err) {
      const problem = asProblem(err);
      if (problem.status === 409) {
        setFormError(t('practice.booking.conflict', { team: values.teamName.trim() }));
      } else if (problem.status === 422) {
        setFormError(problem.data?.title === 'Match is full' ? t('practice.booking.full') : t('practice.booking.notBookable'));
      } else {
        setFormError(t('practice.booking.genericError'));
      }
    }
  }

  return (
    <section aria-labelledby="booking-title" className="rounded-3xl border border-border bg-card p-5">
      <h2 id="booking-title" className="mb-4 font-display text-xl font-extrabold">
        {t('practice.booking.title')}
      </h2>
      {success && (
        <div role="status" className="mb-4 rounded-xl bg-accent p-3">
          <p className="font-bold text-accent-foreground">{success}</p>
          <p className="text-sm text-muted-foreground">{t('practice.booking.successHint')}</p>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3.5">
        <Field id="booking-team" label={t('practice.booking.teamName')} error={errors.teamName?.message}>
          <input id="booking-team" className={inputClass} {...register('teamName', required)} />
        </Field>
        <Field id="booking-contact" label={t('practice.booking.contactName')} error={errors.contactName?.message}>
          <input id="booking-contact" autoComplete="name" className={inputClass} {...register('contactName', required)} />
        </Field>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field id="booking-phone" label={t('practice.booking.contactPhone')} error={errors.contactPhone?.message}>
            <input id="booking-phone" type="tel" autoComplete="tel" className={inputClass} {...register('contactPhone', required)} />
          </Field>
          <Field id="booking-email" label={t('practice.booking.contactEmail')} error={errors.contactEmail?.message}>
            <input
              id="booking-email"
              type="email"
              autoComplete="email"
              className={inputClass}
              {...register('contactEmail', {
                ...required,
                pattern: { value: EMAIL_RE, message: t('practice.form.errors.email') },
              })}
            />
          </Field>
        </div>
        <Field id="booking-message" label={t('practice.booking.message')}>
          <textarea id="booking-message" rows={3} className={`${inputClass} py-3`} {...register('message')} />
        </Field>
        <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" {...register('website')} />
        <ConsentCheckbox
          label={t('practice.consent.booking')}
          error={errors.acceptTerms?.message}
          {...register('acceptTerms', { validate: (v) => v || t('practice.consent.required') })}
        />
        {formError && (
          <p role="alert" className="text-sm font-semibold text-destructive">
            {formError}
          </p>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="min-h-14 rounded-2xl bg-primary text-lg font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {isLoading ? t('practice.booking.submitting') : t('practice.booking.submit')}
        </button>
      </form>
    </section>
  );
}
