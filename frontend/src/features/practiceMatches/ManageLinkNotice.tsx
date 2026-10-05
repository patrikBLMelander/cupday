import { Check, Copy, KeyRound, Mail, Share2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatLongDate } from '@/features/practiceMatches/practiceMatchFormat';
import type { PracticeMatch } from '@/features/practiceMatches/practiceMatchTypes';
import { cn } from '@/lib/cn';

interface ManageLinkNoticeProps {
  match: PracticeMatch;
  token: string;
  /** Right after posting: loud until the organizer has saved the link one way or another. */
  emphasized: boolean;
  /** The backend also emailed the link to the organizer. */
  emailSent?: boolean;
}

function manageLink(matchId: string, token: string): string {
  return `${window.location.origin}/matcher/${matchId}/hantera#${encodeURIComponent(token)}`;
}

/**
 * The manage link is the only key to edit/cancel a match (no accounts, no email service),
 * so this card pushes the organizer to mail, share or copy it.
 */
export function ManageLinkNotice({ match, token, emphasized, emailSent = false }: ManageLinkNoticeProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'sv';
  const [saved, setSaved] = useState(!emphasized);
  const [copied, setCopied] = useState(false);
  const link = manageLink(match.id, token);
  const canShare = typeof navigator.share === 'function';
  const subject = t('practice.manage.emailSubject', { team: match.teamName });
  const body = t('practice.manage.emailBody', {
    team: match.teamName,
    date: formatLongDate(match.kickoffAt, locale),
    link,
  });
  const mailto = `mailto:${encodeURIComponent(match.contactEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setSaved(true);
    } catch {
      setCopied(false);
    }
  }

  async function share(): Promise<void> {
    try {
      await navigator.share({ title: subject, text: body });
      setSaved(true);
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  }

  const loud = emphasized && !saved;
  const buttonBase =
    'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <section
      aria-labelledby="manage-link-title"
      className={cn(
        'rounded-2xl border bg-card p-4',
        loud ? 'border-2 border-primary bg-accent p-5 shadow-lg' : 'border-primary',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground',
            loud ? 'h-12 w-12' : 'h-9 w-9',
          )}
        >
          <KeyRound className={loud ? 'h-6 w-6' : 'h-4 w-4'} />
        </span>
        <div className="min-w-0">
          <h2 id="manage-link-title" className={cn('font-display font-extrabold', loud ? 'text-2xl' : 'text-lg')}>
            {loud ? t('practice.manage.linkImportantTitle') : t('practice.manage.linkTitle')}
          </h2>
          <p className={cn('mt-1', loud ? 'font-semibold' : 'text-sm text-muted-foreground')}>
            {loud ? t('practice.manage.linkImportantBody') : t('practice.manage.linkBody')}
          </p>
        </div>
      </div>

      {emailSent && (
        <p role="status" className="mt-3 rounded-xl bg-card p-3 text-sm font-semibold">
          {t('practice.manage.emailSent', { email: match.contactEmail })}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <label htmlFor="manage-link" className="sr-only">
          {t('practice.manage.linkLabel')}
        </label>
        <input
          id="manage-link"
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
        />
        <div className="grid gap-2 sm:grid-cols-3">
          <a
            href={mailto}
            onClick={() => setSaved(true)}
            className={cn(buttonBase, 'bg-primary text-primary-foreground hover:bg-primary/90')}
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            {t('practice.manage.emailToMe')}
          </a>
          {canShare && (
            <button type="button" onClick={() => void share()} className={cn(buttonBase, 'border border-input bg-card hover:bg-muted')}>
              <Share2 className="h-4 w-4" aria-hidden="true" />
              {t('practice.manage.share')}
            </button>
          )}
          <button type="button" onClick={() => void copy()} className={cn(buttonBase, 'border border-input bg-card hover:bg-muted')}>
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied ? t('practice.manage.copied') : t('practice.manage.copy')}
          </button>
        </div>
        {loud && (
          <button
            type="button"
            onClick={() => setSaved(true)}
            className="mt-1 min-h-11 self-start text-sm font-semibold text-muted-foreground underline"
          >
            {t('practice.manage.savedConfirm')}
          </button>
        )}
        {emphasized && saved && (
          <p role="status" className="text-sm font-semibold text-accent-foreground">
            {t('practice.manage.saved')}
          </p>
        )}
      </div>
    </section>
  );
}
