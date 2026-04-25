import { skipToken } from '@reduxjs/toolkit/query';
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useCreateCupMutation,
  useGetCupQuery,
  useUpdateCupMutation,
} from '@/features/cups/cupsApi';
import type {
  CupCreateRequest,
  CupStatus,
} from '@/features/cups/cupTypes';
import { hexToHslChannels, hslChannelsToHex } from '@/lib/color';
import { slugify } from '@/lib/slug';

const EMAIL_RE = /^.+@.+\..+$/;
const SLUG_RE = /^[a-z0-9-]+$/;
const DEFAULT_PRIMARY_HEX = '#1d4ed8';
const DEFAULT_ACCENT_HEX = '#f1f5f9';

type FormShape = CupCreateRequest;
type Errors = Partial<Record<keyof FormShape | '_form', string>>;

function emptyForm(): FormShape {
  return {
    slug: '',
    name: '',
    organizingClubName: '',
    organizingClubColors: {
      primary: hexToHslChannels(DEFAULT_PRIMARY_HEX),
      accent: hexToHslChannels(DEFAULT_ACCENT_HEX),
    },
    startDate: '',
    endDate: '',
    venueName: '',
    pitchCount: 2,
    maxTeams: 8,
    registrationFeeSek: 0,
    paymentInstructions: '',
    paymentLagkassanLink: '',
    paymentLagkassanQrUrl: '',
    organizerContactName: '',
    organizerContactEmail: '',
    organizerContactPhone: '',
  };
}

function validate(form: FormShape, t: (key: string) => string): Errors {
  const errors: Errors = {};
  if (!form.name.trim()) errors.name = t('admin.cupForm.validation.required');
  if (!form.slug.trim()) errors.slug = t('admin.cupForm.validation.required');
  else if (!SLUG_RE.test(form.slug)) errors.slug = t('admin.cupForm.validation.slugInvalid');
  if (!form.organizingClubName.trim()) {
    errors.organizingClubName = t('admin.cupForm.validation.required');
  }
  if (!form.startDate) errors.startDate = t('admin.cupForm.validation.required');
  if (!form.endDate) errors.endDate = t('admin.cupForm.validation.required');
  if (form.startDate && form.endDate && form.startDate > form.endDate) {
    errors.endDate = t('admin.cupForm.validation.dateOrder');
  }
  if (!form.venueName.trim()) errors.venueName = t('admin.cupForm.validation.required');
  if (form.pitchCount < 1) errors.pitchCount = t('admin.cupForm.validation.minPitchCount');
  if (form.maxTeams < 2) errors.maxTeams = t('admin.cupForm.validation.minMaxTeams');
  if (form.registrationFeeSek < 0) {
    errors.registrationFeeSek = t('admin.cupForm.validation.nonNegative');
  }
  if (!form.organizerContactName.trim()) {
    errors.organizerContactName = t('admin.cupForm.validation.required');
  }
  if (form.organizerContactEmail && !EMAIL_RE.test(form.organizerContactEmail)) {
    errors.organizerContactEmail = t('admin.cupForm.validation.emailInvalid');
  }
  return errors;
}

function safeHslToHex(channels: string, fallback: string): string {
  try {
    return hslChannelsToHex(channels);
  } catch {
    return fallback;
  }
}

export function AdminCupSettingsPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const slugDirtyRef = useRef(false);

  const { data: existing, isLoading: isLoadingExisting } = useGetCupQuery(
    id ?? skipToken,
  );
  const [createCup, { isLoading: isCreating }] = useCreateCupMutation();
  const [updateCup, { isLoading: isUpdating }] = useUpdateCupMutation();
  const isSubmitting = isCreating || isUpdating;

  const [form, setForm] = useState<FormShape>(emptyForm);
  const [errors, setErrors] = useState<Errors>({});
  const [savedFlash, setSavedFlash] = useState(false);
  const [status, setStatus] = useState<CupStatus>('draft');

  useEffect(() => {
    if (!existing) return;
    setForm({
      slug: existing.slug,
      name: existing.name,
      organizingClubName: existing.organizingClubName,
      organizingClubColors: existing.organizingClubColors,
      startDate: existing.startDate,
      endDate: existing.endDate,
      venueName: existing.venueName,
      pitchCount: existing.pitchCount,
      maxTeams: existing.maxTeams,
      registrationFeeSek: existing.registrationFeeSek,
      paymentInstructions: existing.paymentInstructions,
      paymentLagkassanLink: existing.paymentLagkassanLink,
      paymentLagkassanQrUrl: existing.paymentLagkassanQrUrl,
      organizerContactName: existing.organizerContactName,
      organizerContactEmail: existing.organizerContactEmail,
      organizerContactPhone: existing.organizerContactPhone,
    });
    setStatus(existing.status);
    slugDirtyRef.current = true;
  }, [existing]);

  function update<K extends keyof FormShape>(key: K, value: FormShape[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleNameChange(name: string): void {
    setForm((prev) => ({
      ...prev,
      name,
      slug: slugDirtyRef.current ? prev.slug : slugify(name),
    }));
    setErrors((prev) => ({ ...prev, name: undefined, slug: undefined }));
  }

  function handleSlugChange(slug: string): void {
    slugDirtyRef.current = true;
    update('slug', slug);
  }

  function handleColorChange(key: 'primary' | 'accent', hex: string): void {
    setForm((prev) => ({
      ...prev,
      organizingClubColors: {
        ...prev.organizingClubColors,
        [key]: hexToHslChannels(hex),
      },
    }));
  }

  async function save(thenOpen: boolean): Promise<void> {
    const validationErrors = validate(form, t);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    try {
      if (isEdit && id) {
        await updateCup({ id, ...form }).unwrap();
        if (thenOpen && status === 'draft') {
          await updateCup({ id, status: 'open' }).unwrap();
          setStatus('open');
        }
        setSavedFlash(true);
        window.setTimeout(() => setSavedFlash(false), 2000);
      } else {
        const created = await createCup(form).unwrap();
        navigate(`/admin/cups/${created.id}`);
      }
    } catch (err) {
      const e = err as { status?: number; data?: { detail?: string } };
      if (e.status === 409) {
        setErrors({
          slug: e.data?.detail ?? t('admin.cupForm.validation.slugInvalid'),
        });
      } else {
        setErrors({ _form: t('admin.cup.saveFailed') });
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void save(false);
  }

  if (isLoadingExisting) {
    return (
      <p role="status" aria-live="polite">
        {t('common.loading')}
      </p>
    );
  }

  const primaryHex = safeHslToHex(
    form.organizingClubColors.primary,
    DEFAULT_PRIMARY_HEX,
  );
  const accentHex = safeHslToHex(
    form.organizingClubColors.accent,
    DEFAULT_ACCENT_HEX,
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-3xl flex-col gap-6"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
          <Link to="/admin">← {t('admin.cup.backToOverview')}</Link>
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {isEdit ? t('admin.cup.editTitle') : t('admin.cup.newTitle')}
          </h1>
          {isEdit && id && (
            <Button asChild variant="outline" size="sm">
              <Link to={`/admin/cups/${id}/teams`}>
                {t('admin.teams.manageCta')}
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.cupForm.basics')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="name" label={t('admin.cupForm.name')} error={errors.name}>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </Field>
          <Field id="slug" label={t('admin.cupForm.slug')} error={errors.slug}>
            <Input
              id="slug"
              value={form.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
            />
          </Field>
          <Field
            id="organizingClubName"
            label={t('admin.cupForm.organizingClub')}
            error={errors.organizingClubName}
          >
            <Input
              id="organizingClubName"
              value={form.organizingClubName}
              onChange={(e) => update('organizingClubName', e.target.value)}
            />
          </Field>
          <Field
            id="venueName"
            label={t('admin.cupForm.venue')}
            error={errors.venueName}
          >
            <Input
              id="venueName"
              value={form.venueName}
              onChange={(e) => update('venueName', e.target.value)}
            />
          </Field>
          <Field
            id="startDate"
            label={t('admin.cupForm.startDate')}
            error={errors.startDate}
          >
            <Input
              id="startDate"
              type="date"
              value={form.startDate}
              onChange={(e) => update('startDate', e.target.value)}
            />
          </Field>
          <Field
            id="endDate"
            label={t('admin.cupForm.endDate')}
            error={errors.endDate}
          >
            <Input
              id="endDate"
              type="date"
              value={form.endDate}
              onChange={(e) => update('endDate', e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.cupForm.capacity')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            id="pitchCount"
            label={t('admin.cupForm.pitchCount')}
            error={errors.pitchCount}
          >
            <Input
              id="pitchCount"
              type="number"
              min={1}
              value={form.pitchCount}
              onChange={(e) => update('pitchCount', Number(e.target.value))}
            />
          </Field>
          <Field
            id="maxTeams"
            label={t('admin.cupForm.maxTeams')}
            error={errors.maxTeams}
          >
            <Input
              id="maxTeams"
              type="number"
              min={2}
              value={form.maxTeams}
              onChange={(e) => update('maxTeams', Number(e.target.value))}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.cupForm.branding')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-6">
          <Field id="primaryColor" label={t('admin.cupForm.primaryColor')}>
            <Input
              id="primaryColor"
              type="color"
              value={primaryHex}
              onChange={(e) => handleColorChange('primary', e.target.value)}
              className="h-10 w-20 cursor-pointer p-1"
            />
          </Field>
          <Field id="accentColor" label={t('admin.cupForm.accentColor')}>
            <Input
              id="accentColor"
              type="color"
              value={accentHex}
              onChange={(e) => handleColorChange('accent', e.target.value)}
              className="h-10 w-20 cursor-pointer p-1"
            />
          </Field>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              {t('admin.cupForm.preview')}
            </span>
            <div className="flex h-10 w-32 items-center gap-1 rounded border border-border p-1">
              <div
                className="h-full flex-1 rounded"
                style={{
                  backgroundColor: `hsl(${form.organizingClubColors.primary})`,
                }}
                aria-hidden
              />
              <div
                className="h-full flex-1 rounded"
                style={{
                  backgroundColor: `hsl(${form.organizingClubColors.accent})`,
                }}
                aria-hidden
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.cupForm.registration')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field
            id="registrationFeeSek"
            label={t('admin.cupForm.fee')}
            error={errors.registrationFeeSek}
          >
            <Input
              id="registrationFeeSek"
              type="number"
              min={0}
              value={form.registrationFeeSek}
              onChange={(e) =>
                update('registrationFeeSek', Number(e.target.value))
              }
            />
          </Field>
          <Field
            id="paymentInstructions"
            label={t('admin.cupForm.paymentInstructions')}
          >
            <Textarea
              id="paymentInstructions"
              rows={3}
              value={form.paymentInstructions}
              onChange={(e) => update('paymentInstructions', e.target.value)}
            />
          </Field>
          <Field
            id="paymentLagkassanLink"
            label={t('admin.cupForm.lagkassanLink')}
          >
            <Input
              id="paymentLagkassanLink"
              type="url"
              value={form.paymentLagkassanLink}
              onChange={(e) => update('paymentLagkassanLink', e.target.value)}
            />
          </Field>
          <Field
            id="paymentLagkassanQrUrl"
            label={t('admin.cupForm.lagkassanQrUrl')}
          >
            <Input
              id="paymentLagkassanQrUrl"
              type="url"
              value={form.paymentLagkassanQrUrl}
              onChange={(e) => update('paymentLagkassanQrUrl', e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.cupForm.contact')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field
            id="organizerContactName"
            label={t('admin.cupForm.contactName')}
            error={errors.organizerContactName}
          >
            <Input
              id="organizerContactName"
              value={form.organizerContactName}
              onChange={(e) => update('organizerContactName', e.target.value)}
            />
          </Field>
          <Field
            id="organizerContactEmail"
            label={t('admin.cupForm.contactEmail')}
            error={errors.organizerContactEmail}
          >
            <Input
              id="organizerContactEmail"
              type="email"
              value={form.organizerContactEmail}
              onChange={(e) => update('organizerContactEmail', e.target.value)}
            />
          </Field>
          <Field
            id="organizerContactPhone"
            label={t('admin.cupForm.contactPhone')}
          >
            <Input
              id="organizerContactPhone"
              type="tel"
              value={form.organizerContactPhone}
              onChange={(e) => update('organizerContactPhone', e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      {errors._form && (
        <p role="alert" className="text-sm text-destructive">
          {errors._form}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {t('admin.cup.save')}
        </Button>
        {isEdit && existing && (
          <Button asChild variant="outline">
            <Link
              to={`/c/${existing.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('admin.cup.preview')}
            </Link>
          </Button>
        )}
        {isEdit && status === 'draft' && (
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={() => void save(true)}
          >
            {t('admin.cup.publish')}
          </Button>
        )}
        {savedFlash && (
          <span role="status" className="text-sm text-green-600">
            {t('admin.cup.savedFlash')}
          </span>
        )}
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
