import { forwardRef, useId, type ReactNode } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export const inputClass =
  'w-full min-h-12 rounded-xl border border-input bg-background px-3 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive';

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

/** Label + control + hint/error, wired with ids for screen readers. */
export function Field({ id, label, hint, error, children }: FieldProps): JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-sm text-muted-foreground">{hint}</p>}
      {error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

type ConsentProps = { label: string; error?: string } & Omit<UseFormRegisterReturn, 'ref'>;

/** Required consent checkbox with a link to the privacy page (opens in a new tab so the form is kept). */
export const ConsentCheckbox = forwardRef<HTMLInputElement, ConsentProps>(function ConsentCheckbox(
  { label, error, ...inputProps },
  ref,
) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-3">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          aria-invalid={Boolean(error)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[hsl(var(--primary))]"
          {...inputProps}
        />
        <label htmlFor={id} className="text-sm leading-snug">
          {label}{' '}
          <Link to="/matcher/integritet" target="_blank" className="font-semibold text-accent-foreground underline">
            {t('practice.consent.readMore')}
          </Link>
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
});
