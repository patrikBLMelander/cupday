import { Minus, Plus } from 'lucide-react';
import { forwardRef, useState, type ReactNode } from 'react';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Field, inputClass } from '@/features/practiceMatches/FormField';
import { getMatchToken, readTeamQuery, saveMatchToken } from '@/features/practiceMatches/manageTokens';
import { asProblem } from '@/features/practiceMatches/practiceMatchErrors';
import { localDateKey } from '@/features/practiceMatches/practiceMatchFeed';
import { formatLabel, levelLabel } from '@/features/practiceMatches/practiceMatchFormat';
import {
  useCreatePracticeMatchMutation,
  useGetManagedPracticeMatchQuery,
  useUpdatePracticeMatchMutation,
} from '@/features/practiceMatches/practiceMatchesApi';
import {
  GENDERS,
  LEVEL_KEYS,
  MAX_OPPONENT_SLOTS,
  PLAYERS_PER_SIDE,
  type Gender,
  type PlayersPerSide,
  type PracticeMatch,
  type PracticeMatchRequest,
} from '@/features/practiceMatches/practiceMatchTypes';
import { cn } from '@/lib/cn';

const EMAIL_RE = /^.+@.+\..+$/;
const OLDEST_BIRTH_YEAR = 1990;
const YOUNGEST_AGE = 4;

export interface MatchFormValues {
  teamName: string;
  gender: Gender;
  birthYear: string;
  date: string;
  time: string;
  venue: string;
  playersPerSide: string;
  level: string;
  opponentSlots: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  costSek: string;
  notes: string;
  website: string;
}

function emptyValues(): MatchFormValues {
  return {
    teamName: readTeamQuery(),
    gender: 'P',
    birthYear: '',
    date: '',
    time: '',
    venue: '',
    playersPerSide: '7',
    level: '5',
    opponentSlots: 1,
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    costSek: '',
    notes: '',
    website: '',
  };
}

function valuesFromMatch(match: PracticeMatch): MatchFormValues {
  const kickoff = new Date(match.kickoffAt);
  const time = `${String(kickoff.getHours()).padStart(2, '0')}:${String(kickoff.getMinutes()).padStart(2, '0')}`;
  return {
    teamName: match.teamName,
    gender: match.gender,
    birthYear: String(match.birthYear),
    date: localDateKey(kickoff),
    time,
    venue: match.venue,
    playersPerSide: String(match.playersPerSide),
    level: String(match.level),
    opponentSlots: match.opponentSlots,
    contactName: match.contactName,
    contactPhone: match.contactPhone,
    contactEmail: match.contactEmail,
    costSek: match.costSek === null ? '' : String(match.costSek),
    notes: match.notes ?? '',
    website: '',
  };
}

/** Converts form values to the API body. Date + time are interpreted in the browser's time zone. */
function toRequest(values: MatchFormValues): PracticeMatchRequest {
  return {
    teamName: values.teamName.trim(),
    gender: values.gender,
    birthYear: Number(values.birthYear),
    level: Number(values.level),
    playersPerSide: Number(values.playersPerSide) as PlayersPerSide,
    kickoffAt: new Date(`${values.date}T${values.time}`).toISOString(),
    venue: values.venue.trim(),
    opponentSlots: values.opponentSlots,
    contactName: values.contactName.trim(),
    contactPhone: values.contactPhone.trim(),
    contactEmail: values.contactEmail.trim(),
    costSek: values.costSek.trim() === '' ? null : Number(values.costSek),
    notes: values.notes.trim() || null,
    website: values.website,
  };
}

/** Create (`/matcher/ny`) or edit (`/matcher/:id/redigera`) a practice match. */
export function PracticeMatchFormPage(): JSX.Element {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [createMatch] = useCreatePracticeMatchMutation();
  const [updateMatch] = useUpdatePracticeMatchMutation();
  const token = id ? getMatchToken(id) : null;
  const managed = useGetManagedPracticeMatchQuery(
    { id: id ?? '', token: token ?? '' },
    { skip: !id || !token },
  );

  if (!id) {
    return (
      <MatchForm
        mode="create"
        cancelTo="/matcher"
        initial={emptyValues()}
        onSubmit={async (body) => {
          const result = await createMatch(body).unwrap();
          saveMatchToken(result.match.id, result.manageToken);
          navigate(`/matcher/${result.match.id}/hantera`, { state: { justCreated: true } });
        }}
      />
    );
  }

  if (!token || managed.isError) {
    return <p role="alert">{t('practice.manage.invalidLink')}</p>;
  }
  if (!managed.data) {
    return (
      <p role="status" aria-live="polite" className="text-muted-foreground">
        {t('common.loading')}
      </p>
    );
  }

  return (
    <MatchForm
      mode="edit"
      cancelTo={`/matcher/${id}/hantera`}
      initial={valuesFromMatch(managed.data.match)}
      onSubmit={async (body) => {
        await updateMatch({ id, token, body }).unwrap();
        navigate(`/matcher/${id}/hantera`);
      }}
    />
  );
}

interface MatchFormProps {
  mode: 'create' | 'edit';
  cancelTo: string;
  initial: MatchFormValues;
  onSubmit: (body: PracticeMatchRequest) => Promise<void>;
}

function MatchForm({ mode, cancelTo, initial, onSubmit }: MatchFormProps): JSX.Element {
  const { t } = useTranslation();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MatchFormValues>({ defaultValues: initial });
  const slots = watch('opponentSlots');
  const requiredText = t('practice.form.errors.required');
  const required = { validate: (v: string) => v.trim().length > 0 || requiredText };
  const currentYear = new Date().getFullYear();
  const birthYears = Array.from(
    { length: currentYear - YOUNGEST_AGE - OLDEST_BIRTH_YEAR + 1 },
    (_, i) => currentYear - YOUNGEST_AGE - i,
  );

  async function submit(values: MatchFormValues): Promise<void> {
    setFormError(null);
    try {
      await onSubmit(toRequest(values));
    } catch (err) {
      const detail = asProblem(err).data?.detail ?? '';
      if (detail.includes('opponentSlots')) {
        setError('opponentSlots', { message: t('practice.form.errors.slotsBelowBookings') });
      } else if (detail.includes('kickoffAt')) {
        setError('time', { message: t('practice.form.errors.future') });
      } else {
        setFormError(t('practice.form.errors.generic'));
      }
    }
  }

  function validateFuture(time: string): true | string {
    if (!time) return requiredText;
    const date = getValues('date');
    if (!date) return true;
    return new Date(`${date}T${time}`).getTime() > Date.now() || t('practice.form.errors.future');
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold">
          {mode === 'create' ? t('practice.form.createTitle') : t('practice.form.editTitle')}
        </h1>
        <Link to={cancelTo} className="inline-flex min-h-11 items-center font-semibold text-muted-foreground hover:underline">
          {t('practice.form.cancel')}
        </Link>
      </div>

      <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-4">
        <Section title={t('practice.form.sectionMatch')}>
          <Field id="pm-team" label={t('practice.form.teamName')} error={errors.teamName?.message}>
            <input
              id="pm-team"
              placeholder={t('practice.form.teamNamePlaceholder')}
              aria-invalid={Boolean(errors.teamName)}
              className={inputClass}
              {...register('teamName', required)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="pm-date" label={t('practice.form.date')} error={errors.date?.message}>
              <input id="pm-date" type="date" aria-invalid={Boolean(errors.date)} className={inputClass} {...register('date', required)} />
            </Field>
            <Field id="pm-time" label={t('practice.form.time')} error={errors.time?.message}>
              <input
                id="pm-time"
                type="time"
                aria-invalid={Boolean(errors.time)}
                className={inputClass}
                {...register('time', { validate: validateFuture })}
              />
            </Field>
          </div>
          <Field id="pm-venue" label={t('practice.form.venue')} error={errors.venue?.message}>
            <input
              id="pm-venue"
              placeholder={t('practice.form.venuePlaceholder')}
              aria-invalid={Boolean(errors.venue)}
              className={inputClass}
              {...register('venue', required)}
            />
          </Field>
        </Section>

        <Section title={t('practice.form.sectionTeam')}>
          <div className="grid grid-cols-2 gap-3">
            <ChipGroup legend={t('practice.form.gender')} columns={3}>
              {GENDERS.map((gender) => (
                <Chip key={gender} label={t(`practice.gender.${gender}`)} value={gender} {...register('gender')} />
              ))}
            </ChipGroup>
            <Field id="pm-birth-year" label={t('practice.form.birthYear')} error={errors.birthYear?.message}>
              <select
                id="pm-birth-year"
                aria-invalid={Boolean(errors.birthYear)}
                className={inputClass}
                {...register('birthYear', required)}
              >
                <option value="">–</option>
                {birthYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <ChipGroup legend={t('practice.form.format')} columns={4}>
            {PLAYERS_PER_SIDE.map((format) => (
              <Chip key={format} label={formatLabel(t, format)} value={String(format)} {...register('playersPerSide')} />
            ))}
          </ChipGroup>
          <ChipGroup legend={t('practice.form.level')} columns={3} hint={t('practice.form.levelHint')}>
            {LEVEL_KEYS.map((_, i) => (
              <Chip key={i} label={levelLabel(t, i + 1)} value={String(i + 1)} {...register('level')} />
            ))}
          </ChipGroup>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div id="pm-slots-label" className="text-sm font-semibold">
                  {t('practice.form.slots')}
                </div>
                <div className="text-sm text-muted-foreground">{t('practice.form.slotsHint')}</div>
              </div>
              <div role="group" aria-labelledby="pm-slots-label" className="flex items-center gap-1 rounded-xl bg-secondary p-1">
                <button
                  type="button"
                  aria-label={t('practice.form.fewer')}
                  disabled={slots <= 1}
                  onClick={() => setValue('opponentSlots', slots - 1)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-card disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <output aria-live="polite" className="w-8 text-center font-extrabold">
                  {slots}
                </output>
                <button
                  type="button"
                  aria-label={t('practice.form.more')}
                  disabled={slots >= MAX_OPPONENT_SLOTS}
                  onClick={() => setValue('opponentSlots', slots + 1)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-card disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            {errors.opponentSlots?.message && (
              <p role="alert" className="text-sm font-semibold text-destructive">
                {errors.opponentSlots.message}
              </p>
            )}
          </div>
        </Section>

        <Section title={t('practice.form.sectionContact')}>
          <Field id="pm-contact-name" label={t('practice.form.contactName')} error={errors.contactName?.message}>
            <input
              id="pm-contact-name"
              autoComplete="name"
              aria-invalid={Boolean(errors.contactName)}
              className={inputClass}
              {...register('contactName', required)}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="pm-contact-phone" label={t('practice.form.contactPhone')} error={errors.contactPhone?.message}>
              <input
                id="pm-contact-phone"
                type="tel"
                autoComplete="tel"
                aria-invalid={Boolean(errors.contactPhone)}
                className={inputClass}
                {...register('contactPhone', required)}
              />
            </Field>
            <Field id="pm-contact-email" label={t('practice.form.contactEmail')} error={errors.contactEmail?.message}>
              <input
                id="pm-contact-email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(errors.contactEmail)}
                className={inputClass}
                {...register('contactEmail', {
                  ...required,
                  pattern: { value: EMAIL_RE, message: t('practice.form.errors.email') },
                })}
              />
            </Field>
          </div>
        </Section>

        <Section title={t('practice.form.sectionOther')}>
          <Field id="pm-cost" label={t('practice.form.cost')} hint={t('practice.form.costHint')} error={errors.costSek?.message}>
            <input
              id="pm-cost"
              type="number"
              inputMode="numeric"
              min={0}
              aria-invalid={Boolean(errors.costSek)}
              className={inputClass}
              {...register('costSek', {
                validate: (v) => v.trim() === '' || Number(v) >= 0 || t('practice.form.errors.costNonNegative'),
              })}
            />
          </Field>
          <Field id="pm-notes" label={t('practice.form.notes')}>
            <textarea
              id="pm-notes"
              rows={4}
              placeholder={t('practice.form.notesPlaceholder')}
              className={cn(inputClass, 'py-3')}
              {...register('notes')}
            />
          </Field>
        </Section>

        <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" {...register('website')} />

        {formError && (
          <p role="alert" className="font-semibold text-destructive">
            {formError}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-14 rounded-2xl bg-primary text-lg font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {isSubmitting
            ? t('practice.form.submitting')
            : mode === 'create'
              ? t('practice.form.submitCreate')
              : t('practice.form.submitEdit')}
        </button>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <section className="flex flex-col gap-4 rounded-[18px] border border-border bg-card p-4">
      <h2 className="font-display text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}

function ChipGroup({
  legend,
  columns,
  hint,
  children,
}: {
  legend: string;
  columns: 3 | 4;
  hint?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-semibold">{legend}</legend>
      <div className={cn('grid gap-1.5', columns === 3 ? 'grid-cols-3' : 'grid-cols-4')}>{children}</div>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </fieldset>
  );
}

type ChipProps = { label: string; value: string } & Omit<UseFormRegisterReturn, 'ref'>;

/** Radio styled as a chip. Forwards the ref so react-hook-form can register it. */
const Chip = forwardRef<HTMLInputElement, ChipProps>(function Chip({ label, value, ...inputProps }, ref) {
  return (
    <label className="relative">
      <input ref={ref} type="radio" value={value} className="peer sr-only" {...inputProps} />
      <span className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-input bg-card px-1 text-center text-sm font-bold peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
        {label}
      </span>
    </label>
  );
});
