import { KeyRound, Plus, Trophy, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';

import type { Cup, PlayersPerTeam } from '@/features/cups/cupTypes';
import { getCupToken, saveCupToken } from '@/features/postedCups/cupTokens';
import { SlotEditor } from '@/features/postedCups/SlotEditor';
import { CUP_LEVEL_LABELS } from '@/features/postedCups/postedCupFormat';
import { draftFromCup, draftToRequest, validateDraft, type SlotDraft } from '@/features/postedCups/slotDraft';
import { useCreatePostedCupMutation, useGetManagedCupQuery, useUpdatePostedCupMutation } from '@/features/postedCups/postedCupsApi';
import type { PostedCupRequest } from '@/features/postedCups/postedCupTypes';
import { ConsentCheckbox, Field, inputClass } from '@/features/practiceMatches/FormField';
import { LevelRangePicker } from '@/features/practiceMatches/LevelRangePicker';
import { asProblem } from '@/features/practiceMatches/practiceMatchErrors';
import { cn } from '@/lib/cn';

const EMAIL_RE = /^.+@.+\..+$/;
const URL_RE = /^https?:\/\/\S+$/i;
const PLAYERS: readonly PlayersPerTeam[] = [5, 7, 9, 11];
const GENDER_PREFIXES = ['P', 'F', 'Mix'] as const;
const OLDEST_BIRTH_YEAR = 1990;

type RegistrationMode = 'dincup' | 'external';

interface CupFormValues {
  name: string;
  organizingClubName: string;
  clubLogoUrl: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  venueName: string;
  hasToilets: boolean;
  hasFood: boolean;
  hasParking: boolean;
  mapUrl: string;
  ageClasses: string[];
  playersPerTeam: string;
  levelMin: number;
  levelMax: number;
  registrationMode: RegistrationMode;
  externalRegistrationUrl: string;
  registrationFeeSek: string;
  registrationDeadline: string;
  paymentLink: string;
  paymentInstructions: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  description: string;
  acceptTerms: boolean;
  website: string;
}

function emptyValues(): CupFormValues {
  return {
    name: '',
    organizingClubName: '',
    clubLogoUrl: '',
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '17:00',
    venueName: '',
    hasToilets: false,
    hasFood: false,
    hasParking: false,
    mapUrl: '',
    ageClasses: [],
    playersPerTeam: '7',
    levelMin: 5,
    levelMax: 5,
    registrationMode: 'dincup',
    externalRegistrationUrl: '',
    registrationFeeSek: '',
    registrationDeadline: '',
    paymentLink: '',
    paymentInstructions: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    description: '',
    acceptTerms: false,
    website: '',
  };
}

function valuesFromCup(cup: Cup): CupFormValues {
  return {
    ...emptyValues(),
    name: cup.name,
    organizingClubName: cup.organizingClubName,
    clubLogoUrl: cup.clubLogoUrl,
    startDate: cup.startDate,
    endDate: cup.endDate,
    startTime: cup.startTime?.slice(0, 5) ?? '09:00',
    endTime: cup.endTime?.slice(0, 5) ?? '17:00',
    venueName: cup.venueName,
    hasToilets: cup.hasToilets,
    hasFood: cup.hasFood,
    hasParking: cup.hasParking,
    mapUrl: cup.mapUrl,
    ageClasses: cup.ageClasses ?? [],
    playersPerTeam: String(cup.playersPerTeam),
    levelMin: cup.levelMin ?? 5,
    levelMax: cup.levelMax ?? 5,
    registrationMode: cup.externalRegistrationUrl ? 'external' : 'dincup',
    externalRegistrationUrl: cup.externalRegistrationUrl ?? '',
    registrationFeeSek: String(cup.registrationFeeSek),
    registrationDeadline: cup.registrationDeadline ?? '',
    paymentLink: cup.paymentLagkassanLink,
    paymentInstructions: cup.paymentInstructions,
    contactName: cup.organizerContactName,
    contactPhone: cup.organizerContactPhone,
    contactEmail: cup.organizerContactEmail,
    description: cup.description ?? '',
    acceptTerms: true,
  };
}

const NEW_SLOTS: SlotDraft = { lockLevels: false, groups: { '': { maxTeams: '16', levels: [] } } };

function toRequest(v: CupFormValues, slots: SlotDraft): PostedCupRequest {
  const external = v.registrationMode === 'external';
  const slotRequest = draftToRequest({ ...slots, lockLevels: slots.lockLevels && !external }, v.ageClasses);
  return {
    name: v.name.trim(),
    organizingClubName: v.organizingClubName.trim(),
    clubLogoUrl: v.clubLogoUrl.trim() || null,
    startDate: v.startDate,
    endDate: v.endDate,
    startTime: v.startTime,
    endTime: v.endTime,
    venueName: v.venueName.trim(),
    ageClasses: v.ageClasses,
    playersPerTeam: Number(v.playersPerTeam) as PlayersPerTeam,
    levelMin: v.levelMin,
    levelMax: v.levelMax,
    maxTeams: slotRequest.maxTeams,
    registrationFeeSek: Number(v.registrationFeeSek || 0),
    registrationDeadline: v.registrationDeadline || null,
    externalRegistrationUrl: external ? v.externalRegistrationUrl.trim() : null,
    paymentLink: v.paymentLink.trim() || null,
    paymentInstructions: v.paymentInstructions.trim() || null,
    slots: slotRequest.slots,
    contactName: v.contactName.trim(),
    contactPhone: v.contactPhone.trim(),
    contactEmail: v.contactEmail.trim(),
    description: v.description.trim() || null,
    hasToilets: v.hasToilets,
    hasFood: v.hasFood,
    hasParking: v.hasParking,
    mapUrl: v.mapUrl.trim() || null,
    acceptTerms: v.acceptTerms,
    website: v.website,
  };
}

/** Post (`/matcher/ny-cup`) or edit (`/matcher/cup/:id/redigera`) a cup without an account. */
export function PostedCupFormPage(): JSX.Element {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [createCup] = useCreatePostedCupMutation();
  const [updateCup] = useUpdatePostedCupMutation();
  const token = id ? getCupToken(id) : null;
  const managed = useGetManagedCupQuery({ id: id ?? '', token: token ?? '' }, { skip: !id || !token });

  if (!id) {
    return (
      <CupForm
        mode="create"
        cancelTo="/matcher"
        initial={emptyValues()}
        initialSlots={NEW_SLOTS}
        onSubmit={async (body) => {
          const result = await createCup(body).unwrap();
          saveCupToken(result.cup.id, result.manageToken);
          navigate(`/matcher/cup/${result.cup.id}/spara-lank`);
        }}
      />
    );
  }
  if (!token || managed.isError) return <p role="alert">{t('postedCup.manage.invalidLink')}</p>;
  if (!managed.data) {
    return (
      <p role="status" aria-live="polite" className="text-muted-foreground">
        {t('common.loading')}
      </p>
    );
  }
  return (
    <CupForm
      mode="edit"
      cancelTo={`/matcher/cup/${id}/hantera`}
      initial={valuesFromCup(managed.data.cup)}
      initialSlots={draftFromCup(managed.data.cup)}
      onSubmit={async (body) => {
        await updateCup({ id, token, body }).unwrap();
        navigate(`/matcher/cup/${id}/hantera`);
      }}
    />
  );
}

interface CupFormProps {
  mode: 'create' | 'edit';
  cancelTo: string;
  initial: CupFormValues;
  initialSlots: SlotDraft;
  onSubmit: (body: PostedCupRequest) => Promise<void>;
}

function CupForm({ mode, cancelTo, initial, initialSlots, onSubmit }: CupFormProps): JSX.Element {
  const { t } = useTranslation();
  const [formError, setFormError] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotDraft>(initialSlots);
  const [slotError, setSlotError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CupFormValues>({ defaultValues: initial });
  const requiredText = t('practice.form.errors.required');
  const required = { validate: (v: string) => v.trim().length > 0 || requiredText };
  const optionalUrl = { validate: (v: string) => !v.trim() || URL_RE.test(v.trim()) || t('postedCup.form.errors.url') };

  register('ageClasses', { validate: (v) => v.length > 0 || t('postedCup.form.errors.ageClasses') });

  const [ageClasses, levelMin, levelMax, registrationMode] = watch(['ageClasses', 'levelMin', 'levelMax', 'registrationMode']);

  async function submit(values: CupFormValues): Promise<void> {
    setFormError(null);
    const draftError = validateDraft(
      { ...slots, lockLevels: slots.lockLevels && values.registrationMode === 'dincup' },
      values.ageClasses,
    );
    setSlotError(draftError ? t(`postedCup.form.errors.slots.${draftError}`) : null);
    if (draftError) return;
    if (draftToRequest(slots, values.ageClasses).maxTeams < 2) {
      setSlotError(t('postedCup.form.errors.maxTeams'));
      return;
    }
    try {
      await onSubmit(toRequest(values, slots));
    } catch (err) {
      const detail = asProblem(err).data?.detail ?? '';
      if (detail.includes('maxTeams cannot be lower')) {
        setSlotError(t('postedCup.form.errors.maxBelowTeams'));
      } else if (detail.includes('would have no slot') || detail.includes('already has')) {
        setSlotError(t('postedCup.form.errors.quotaBelowTeams'));
      } else {
        setFormError(t('practice.form.errors.generic'));
      }
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="inline-flex items-center gap-2 font-display text-3xl font-extrabold">
          <Trophy className="h-7 w-7 text-amber-700 dark:text-amber-400" aria-hidden="true" />
          {mode === 'create' ? t('postedCup.form.createTitle') : t('postedCup.form.editTitle')}
        </h1>
        <Link to={cancelTo} className="inline-flex min-h-11 items-center font-semibold text-muted-foreground hover:underline">
          {t('practice.form.cancel')}
        </Link>
      </div>

      <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-4">
        <Section title={t('postedCup.form.sectionCup')}>
          <Field id="pc-name" label={t('postedCup.form.name')} error={errors.name?.message}>
            <input id="pc-name" placeholder={t('postedCup.form.namePlaceholder')} aria-invalid={Boolean(errors.name)} className={inputClass} {...register('name', required)} />
          </Field>
          <Field id="pc-club" label={t('postedCup.form.club')} error={errors.organizingClubName?.message}>
            <input id="pc-club" aria-invalid={Boolean(errors.organizingClubName)} className={inputClass} {...register('organizingClubName', required)} />
          </Field>
          <Field id="pc-logo" label={t('postedCup.form.logo')} error={errors.clubLogoUrl?.message}>
            <input id="pc-logo" type="url" placeholder="https://" className={inputClass} {...register('clubLogoUrl', optionalUrl)} />
          </Field>
        </Section>

        <Section title={t('postedCup.form.sectionWhen')}>
          <div className="grid grid-cols-2 gap-3">
            <Field id="pc-start-date" label={t('postedCup.form.startDate')} error={errors.startDate?.message}>
              <input id="pc-start-date" type="date" aria-invalid={Boolean(errors.startDate)} className={inputClass} {...register('startDate', required)} />
            </Field>
            <Field id="pc-end-date" label={t('postedCup.form.endDate')} error={errors.endDate?.message}>
              <input
                id="pc-end-date"
                type="date"
                aria-invalid={Boolean(errors.endDate)}
                className={inputClass}
                {...register('endDate', {
                  validate: (v) => (!v ? requiredText : v >= getValues('startDate') || t('postedCup.form.errors.endDate')),
                })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="pc-start-time" label={t('practice.form.time')} error={errors.startTime?.message}>
              <input id="pc-start-time" type="time" aria-invalid={Boolean(errors.startTime)} className={inputClass} {...register('startTime', required)} />
            </Field>
            <Field id="pc-end-time" label={t('practice.form.endTime')} error={errors.endTime?.message}>
              <input
                id="pc-end-time"
                type="time"
                aria-invalid={Boolean(errors.endTime)}
                className={inputClass}
                {...register('endTime', {
                  validate: (v) => (!v ? requiredText : v > getValues('startTime') || t('practice.form.errors.endAfterStart')),
                })}
              />
            </Field>
          </div>
          <p className="-mt-2 text-sm text-muted-foreground">{t('postedCup.form.timeHint')}</p>
          <Field id="pc-venue" label={t('practice.form.venue')} error={errors.venueName?.message}>
            <input id="pc-venue" aria-invalid={Boolean(errors.venueName)} className={inputClass} {...register('venueName', required)} />
          </Field>
          <Field id="pc-map" label={t('postedCup.form.mapUrl')} error={errors.mapUrl?.message}>
            <input id="pc-map" type="url" placeholder="https://" className={inputClass} {...register('mapUrl', optionalUrl)} />
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-semibold">{t('postedCup.form.amenities')}</legend>
            <div className="grid grid-cols-3 gap-2">
              {(['hasToilets', 'hasFood', 'hasParking'] as const).map((field) => (
                <label key={field} className="relative">
                  <input type="checkbox" className="peer sr-only" {...register(field)} />
                  <span className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-input bg-card px-2 text-center text-sm font-bold peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                    {t(`postedCup.form.${field}`)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </Section>

        <Section title={t('postedCup.form.sectionWho')}>
          <AgeClassPicker
            value={ageClasses}
            error={errors.ageClasses?.message}
            onChange={(next) => setValue('ageClasses', next, { shouldValidate: Boolean(errors.ageClasses) })}
          />
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-semibold">{t('practice.form.format')}</legend>
            <div className="grid grid-cols-4 gap-1.5">
              {PLAYERS.map((n) => (
                <label key={n} className="relative">
                  <input type="radio" value={String(n)} className="peer sr-only" {...register('playersPerTeam')} />
                  <span className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-input bg-card text-sm font-bold peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                    {t('practice.formatLabel', { n })}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <LevelRangePicker
            min={levelMin}
            max={levelMax}
            onChange={({ min, max }) => {
              setValue('levelMin', min);
              setValue('levelMax', max);
            }}
          />
          <SlotEditor
            classes={ageClasses}
            value={slots}
            onChange={(next) => {
              setSlots(next);
              setSlotError(null);
            }}
            allowLevelLock={registrationMode === 'dincup'}
            defaultLevel={CUP_LEVEL_LABELS[levelMin - 1]}
            error={slotError ?? undefined}
          />
        </Section>

        <Section title={t('postedCup.form.sectionRegistration')}>
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">{t('postedCup.form.registrationMode')}</legend>
            <ModeOption value="dincup" current={registrationMode} title={t('postedCup.form.modeDinCup')} body={t('postedCup.form.modeDinCupBody')} {...register('registrationMode')} />
            <ModeOption value="external" current={registrationMode} title={t('postedCup.form.modeExternal')} body={t('postedCup.form.modeExternalBody')} {...register('registrationMode')} />
          </fieldset>
          {registrationMode === 'external' && (
            <Field id="pc-external" label={t('postedCup.form.externalUrl')} error={errors.externalRegistrationUrl?.message}>
              <input
                id="pc-external"
                type="url"
                placeholder="https://"
                aria-invalid={Boolean(errors.externalRegistrationUrl)}
                className={inputClass}
                {...register('externalRegistrationUrl', {
                  validate: (v) => (!v.trim() ? requiredText : URL_RE.test(v.trim()) || t('postedCup.form.errors.url')),
                })}
              />
            </Field>
          )}
          <Field id="pc-fee" label={t('postedCup.form.fee')} error={errors.registrationFeeSek?.message}>
            <input
              id="pc-fee"
              type="number"
              inputMode="numeric"
              min={0}
              aria-invalid={Boolean(errors.registrationFeeSek)}
              className={inputClass}
              {...register('registrationFeeSek', {
                validate: (v) => (v.trim() === '' ? requiredText : Number(v) >= 0 || t('practice.form.errors.costNonNegative')),
              })}
            />
          </Field>
          <Field id="pc-deadline" label={t('postedCup.form.deadline')}>
            <input id="pc-deadline" type="date" className={inputClass} {...register('registrationDeadline')} />
          </Field>

        </Section>

        <Section title={t('postedCup.form.sectionPayment')}>
          <p className="-mt-2 text-sm text-muted-foreground">{t('postedCup.form.paymentHint')}</p>
          <Field id="pc-pay-link" label={t('postedCup.form.paymentLink')} error={errors.paymentLink?.message}>
            <input id="pc-pay-link" type="url" placeholder="https://" className={inputClass} {...register('paymentLink', optionalUrl)} />
          </Field>
          <Field id="pc-pay-text" label={t('postedCup.form.paymentText')}>
            <textarea id="pc-pay-text" rows={3} placeholder={t('postedCup.form.paymentTextPlaceholder')} className={cn(inputClass, 'py-3')} {...register('paymentInstructions')} />
          </Field>
        </Section>

        <Section title={t('postedCup.form.sectionContact')}>
          <Field id="pc-contact" label={t('postedCup.form.contactName')} error={errors.contactName?.message}>
            <input id="pc-contact" autoComplete="name" aria-invalid={Boolean(errors.contactName)} className={inputClass} {...register('contactName', required)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="pc-phone" label={t('practice.form.contactPhone')} error={errors.contactPhone?.message}>
              <input id="pc-phone" type="tel" autoComplete="tel" aria-invalid={Boolean(errors.contactPhone)} className={inputClass} {...register('contactPhone', required)} />
            </Field>
            <Field id="pc-email" label={t('practice.form.contactEmail')} error={errors.contactEmail?.message}>
              <input
                id="pc-email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(errors.contactEmail)}
                className={inputClass}
                {...register('contactEmail', { ...required, pattern: { value: EMAIL_RE, message: t('practice.form.errors.email') } })}
              />
            </Field>
          </div>
          <Field id="pc-description" label={t('postedCup.form.description')}>
            <textarea id="pc-description" rows={4} placeholder={t('postedCup.form.descriptionPlaceholder')} className={cn(inputClass, 'py-3')} {...register('description')} />
          </Field>
        </Section>

        <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" {...register('website')} />

        {mode === 'create' && (
          <div className="flex items-start gap-3 rounded-2xl border-2 border-primary bg-accent p-4">
            <KeyRound className="mt-0.5 h-6 w-6 shrink-0 text-accent-foreground" aria-hidden="true" />
            <p>
              <strong className="font-bold">{t('postedCup.form.adminLinkTitle')}</strong> {t('postedCup.form.adminLinkInfo')}
            </p>
          </div>
        )}

        <ConsentCheckbox
          label={t('postedCup.form.consent')}
          error={errors.acceptTerms?.message}
          {...register('acceptTerms', { validate: (v) => v || t('practice.consent.required') })}
        />

        {formError && (
          <p role="alert" className="font-semibold text-destructive">
            {formError}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-14 rounded-2xl bg-amber-800 text-lg font-bold text-white hover:bg-amber-900 disabled:opacity-60"
        >
          {isSubmitting ? t('practice.form.submitting') : mode === 'create' ? t('postedCup.form.submitCreate') : t('practice.form.submitEdit')}
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

type ModeOptionProps = {
  value: RegistrationMode;
  current: RegistrationMode;
  title: string;
  body: string;
} & ReturnType<ReturnType<typeof useForm<CupFormValues>>['register']>;

function ModeOption({ value, current, title, body, ...inputProps }: ModeOptionProps): JSX.Element {
  const { ref, ...rest } = inputProps;
  return (
    <label className={cn('flex cursor-pointer items-start gap-3 rounded-2xl border p-3', value === current ? 'border-2 border-primary bg-accent' : 'border-input')}>
      <input ref={ref} type="radio" value={value} className="mt-1 h-5 w-5 shrink-0 accent-[hsl(var(--primary))]" {...rest} />
      <span>
        <span className="block font-bold">{title}</span>
        <span className="text-sm text-muted-foreground">{body}</span>
      </span>
    </label>
  );
}

function AgeClassPicker({ value, error, onChange }: { value: string[]; error?: string; onChange: (next: string[]) => void }): JSX.Element {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const [prefix, setPrefix] = useState<(typeof GENDER_PREFIXES)[number]>('P');
  const [year, setYear] = useState(String(currentYear - 12));
  const years = Array.from({ length: currentYear - 4 - OLDEST_BIRTH_YEAR + 1 }, (_, i) => String(currentYear - 4 - i));
  const candidate = `${prefix}${year.slice(-2)}`;

  function add(): void {
    if (!value.includes(candidate)) onChange([...value, candidate]);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span id="pc-classes-label" className="text-sm font-semibold">
        {t('postedCup.form.ageClasses')}
      </span>
      {value.length > 0 && (
        <ul aria-labelledby="pc-classes-label" className="flex flex-wrap gap-1.5">
          {value.map((cls) => (
            <li key={cls}>
              <button
                type="button"
                onClick={() => onChange(value.filter((c) => c !== cls))}
                aria-label={t('postedCup.form.removeClass', { cls })}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary px-3 text-sm font-bold text-primary-foreground"
              >
                {cls}
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="pc-class-gender">
          {t('practice.form.gender')}
        </label>
        <select id="pc-class-gender" value={prefix} onChange={(e) => setPrefix(e.target.value as typeof prefix)} className={cn(inputClass, 'w-24')}>
          {GENDER_PREFIXES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="pc-class-year">
          {t('practice.form.birthYear')}
        </label>
        <select id="pc-class-year" value={year} onChange={(e) => setYear(e.target.value)} className={cn(inputClass, 'flex-1')}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <button type="button" onClick={add} className="inline-flex min-h-12 shrink-0 items-center gap-1 rounded-xl border border-input bg-card px-3 font-bold hover:bg-muted">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('postedCup.form.addClass', { cls: candidate })}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

