import { forwardRef, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';

import type { PublicCupOutletContext } from '@/app/layouts/PublicLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useCreateRegistrationMutation,
  useListPublicTeamsByCupQuery,
} from '@/features/teams/teamsApi';
import type { RegistrationCreateRequest } from '@/features/teams/teamTypes';

const EMAIL_RE = /^.+@.+\..+$/;

type FormShape = {
  clubName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  teamName1: string;
  teamName2?: string;
  teamLevel1?: string;
  teamLevel2?: string;
  teamLogo1?: string;
  teamLogo2?: string;
};

type ServerErrorBody = {
  detail?: string;
  teamName?: string;
};

function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function RegistrationFormPage(): JSX.Element {
  const { t } = useTranslation();
  const { cup } = useOutletContext<PublicCupOutletContext>();
  const navigate = useNavigate();
  const [secondTeamShown, setSecondTeamShown] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: teams, isLoading: isLoadingTeams } = useListPublicTeamsByCupQuery(cup.id);
  const [createRegistration, { isLoading: isSubmitting }] = useCreateRegistrationMutation();

  const {
    register,
    handleSubmit,
    setError,
    unregister,
    getValues,
    formState: { errors },
  } = useForm<FormShape>({
    defaultValues: {
      clubName: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      teamName1: '',
    },
  });


  if (cup.status !== 'open') {
    return (
      <NotOpenPanel message={t('registration.cupNotOpen')} cupSlug={cup.slug} t={t} />
    );
  }

  if (isLoadingTeams) {
    return (
      <p role="status" aria-live="polite" className="text-muted-foreground">
        {t('common.loading')}
      </p>
    );
  }

  const activeCount = teams?.length ?? 0;
  const remaining = Math.max(0, cup.maxTeams - activeCount);
  if (remaining <= 0) {
    return (
      <NotOpenPanel message={t('registration.cupFull')} cupSlug={cup.slug} t={t} />
    );
  }

  function showSecondTeam(): void {
    setSecondTeamShown(true);
  }

  function hideSecondTeam(): void {
    unregister('teamName2');
    unregister('teamLevel2');
    unregister('teamLogo2');
    setSecondTeamShown(false);
  }

  async function onSubmit(values: FormShape): Promise<void> {
    setFormError(null);
    const teamNames = [values.teamName1.trim()];
    if (secondTeamShown && values.teamName2?.trim()) {
      teamNames.push(values.teamName2.trim());
    }
    const body: RegistrationCreateRequest = {
      clubName: values.clubName.trim(),
      contactName: values.contactName.trim(),
      contactEmail: values.contactEmail.trim(),
      contactPhone: values.contactPhone.trim(),
      teamNames,
    };
    if (cup.useLevels) {
      const levels = [values.teamLevel1 ?? ''];
      if (teamNames.length === 2) {
        levels.push(values.teamLevel2 ?? '');
      }
      body.teamLevels = levels;
    }
    const logos = [values.teamLogo1?.trim() ?? ''];
    if (teamNames.length === 2) {
      logos.push(values.teamLogo2?.trim() ?? '');
    }
    if (logos.some((url) => url.length > 0)) {
      body.teamLogoUrls = logos;
    }
    try {
      const result = await createRegistration({ cupId: cup.id, body }).unwrap();
      navigate(`/c/${cup.slug}/payment/${result.registrationId}`, {
        replace: true,
      });
    } catch (err) {
      const e = err as { status?: number; data?: ServerErrorBody };
      if (e.status === 409 && e.data?.teamName) {
        const conflicting = e.data.teamName.toLowerCase();
        const fieldName: 'teamName1' | 'teamName2' =
          values.teamName2 && conflicting === values.teamName2.trim().toLowerCase()
            ? 'teamName2'
            : 'teamName1';
        setError(fieldName, {
          type: 'taken',
          message: t('registration.validation.nameTaken'),
        });
      } else {
        setFormError(t('registration.generalFailure'));
      }
    }
  }

  const primary = `hsl(${cup.organizingClubColors.primary})`;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="mx-auto flex max-w-2xl flex-col gap-4"
    >
      <header
        className="-mx-4 flex flex-col gap-1 overflow-hidden rounded-lg px-5 py-5 text-white shadow-md sm:-mx-0"
        style={{
          backgroundImage: `linear-gradient(135deg, ${primary} 0%, color-mix(in oklab, ${primary} 70%, black) 100%)`,
        }}
      >
        <span className="text-xs font-medium uppercase tracking-wider text-white/70">
          {cup.name}
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('registration.title')}
        </h1>
        <p className="text-sm text-white/85">
          {t('registration.description')}
        </p>
      </header>

      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <Field
            id="clubName"
            label={t('registration.fields.clubName')}
            error={errors.clubName?.message}
          >
            <Input
              id="clubName"
              autoComplete="organization"
              {...register('clubName', {
                required: t('registration.validation.required'),
              })}
            />
          </Field>
          <Field
            id="contactName"
            label={t('registration.fields.contactName')}
            error={errors.contactName?.message}
          >
            <Input
              id="contactName"
              autoComplete="name"
              {...register('contactName', {
                required: t('registration.validation.required'),
              })}
            />
          </Field>
          <Field
            id="contactEmail"
            label={t('registration.fields.contactEmail')}
            error={errors.contactEmail?.message}
          >
            <Input
              id="contactEmail"
              type="email"
              autoComplete="email"
              {...register('contactEmail', {
                required: t('registration.validation.required'),
                pattern: {
                  value: EMAIL_RE,
                  message: t('registration.validation.emailInvalid'),
                },
              })}
            />
          </Field>
          <Field
            id="contactPhone"
            label={t('registration.fields.contactPhone')}
            error={errors.contactPhone?.message}
          >
            <Input
              id="contactPhone"
              type="tel"
              autoComplete="tel"
              {...register('contactPhone', {
                required: t('registration.validation.required'),
              })}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('public.tabs.teams')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field
            id="teamName1"
            label={t('registration.fields.teamName1')}
            error={errors.teamName1?.message}
          >
            <Input
              id="teamName1"
              {...register('teamName1', {
                required: t('registration.validation.required'),
              })}
            />
          </Field>

          {cup.useLevels && (
            <Field
              id="teamLevel1"
              label={t('registration.fields.level1')}
              error={errors.teamLevel1?.message}
            >
              <LevelSelect
                id="teamLevel1"
                levels={cup.levels}
                placeholder={t('registration.fields.levelPlaceholder')}
                {...register('teamLevel1', {
                  required: t('registration.validation.levelRequired'),
                })}
              />
            </Field>
          )}

          <Field
            id="teamLogo1"
            label={t('registration.fields.logo1')}
          >
            <Input
              id="teamLogo1"
              type="url"
              placeholder="https://"
              {...register('teamLogo1')}
            />
          </Field>

          {secondTeamShown ? (
            <>
              <Field
                id="teamName2"
                label={`${t('registration.fields.teamName2')} (${t('registration.fields.teamName2Hint')})`}
                error={errors.teamName2?.message}
              >
                <div className="flex items-center gap-2">
                  <Input
                    id="teamName2"
                    className="flex-1"
                    {...register('teamName2', {
                      validate: (value) => {
                        if (!value || !value.trim()) return true;
                        const first = getValues('teamName1');
                        if (first && namesMatch(value, first)) {
                          return t('registration.validation.sameNames');
                        }
                        return true;
                      },
                    })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={hideSecondTeam}
                  >
                    {t('registration.fields.removeSecondTeam')}
                  </Button>
                </div>
              </Field>
              {cup.useLevels && (
                <Field
                  id="teamLevel2"
                  label={t('registration.fields.level2')}
                  error={errors.teamLevel2?.message}
                >
                  <LevelSelect
                    id="teamLevel2"
                    levels={cup.levels}
                    placeholder={t('registration.fields.levelPlaceholder')}
                    {...register('teamLevel2', {
                      validate: (value) => {
                        if (!value || !value.trim()) {
                          return t('registration.validation.levelRequired');
                        }
                        return true;
                      },
                    })}
                  />
                </Field>
              )}
              <Field
                id="teamLogo2"
                label={t('registration.fields.logo2')}
              >
                <Input
                  id="teamLogo2"
                  type="url"
                  placeholder="https://"
                  {...register('teamLogo2')}
                />
              </Field>
            </>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={showSecondTeam}
            >
              {t('registration.fields.addAnotherTeam')}
            </Button>
          )}
        </CardContent>
      </Card>

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {t('registration.submit')}
        </Button>
        <Button asChild variant="ghost">
          <Link to={`/c/${cup.slug}`}>{t('registration.backToCup')}</Link>
        </Button>
      </div>
    </form>
  );
}

type LevelSelectProps = {
  id: string;
  levels: string[];
  placeholder: string;
  name?: string;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  onBlur?: React.FocusEventHandler<HTMLSelectElement>;
};

const LevelSelect = forwardRef<HTMLSelectElement, LevelSelectProps>(
  ({ id, levels, placeholder, ...rest }, ref) => (
    <select
      id={id}
      ref={ref}
      defaultValue=""
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      {...rest}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {levels.map((level) => (
        <option key={level} value={level}>
          {level}
        </option>
      ))}
    </select>
  ),
);
LevelSelect.displayName = 'LevelSelect';

function NotOpenPanel({
  message,
  cupSlug,
  t,
}: {
  message: string;
  cupSlug: string;
  t: (key: string) => string;
}): JSX.Element {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 text-center">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10">
          <p className="text-muted-foreground">{message}</p>
          <Button asChild variant="outline">
            <Link to={`/c/${cupSlug}`}>{t('registration.backToCup')}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
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
