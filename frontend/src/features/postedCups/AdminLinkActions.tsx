import { Check, Copy, Mail, Share2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Cup } from '@/features/cups/cupTypes';
import { cupAdminLink } from '@/features/postedCups/cupTokens';
import { cn } from '@/lib/cn';

interface AdminLinkActionsProps {
  cup: Cup;
  token: string;
  /** Called once the organizer has mailed, shared or copied the link. */
  onSaved?: () => void;
}

const buttonBase =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** The cup admin link with "mail to me", "share" and "copy" — the ways to keep it. */
export function AdminLinkActions({ cup, token, onSaved }: AdminLinkActionsProps): JSX.Element {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const link = cupAdminLink(cup.id, token);
  const canShare = typeof navigator.share === 'function';
  const subject = t('postedCup.link.emailSubject', { name: cup.name });
  const body = t('postedCup.link.emailBody', { name: cup.name, link });
  const mailto = `mailto:${encodeURIComponent(cup.organizerContactEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      onSaved?.();
    } catch {
      setCopied(false);
    }
  }

  async function share(): Promise<void> {
    try {
      await navigator.share({ title: subject, text: body });
      onSaved?.();
    } catch {
      // Share sheet dismissed.
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="cup-admin-link" className="sr-only">
        {t('postedCup.link.label')}
      </label>
      <input
        id="cup-admin-link"
        readOnly
        value={link}
        onFocus={(e) => e.currentTarget.select()}
        className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
      />
      <div className="grid gap-2 sm:grid-cols-3">
        <a href={mailto} onClick={() => onSaved?.()} className={cn(buttonBase, 'bg-primary text-primary-foreground hover:bg-primary/90')}>
          <Mail className="h-4 w-4" aria-hidden="true" />
          {t('postedCup.link.emailToMe')}
        </a>
        {canShare && (
          <button type="button" onClick={() => void share()} className={cn(buttonBase, 'border border-input bg-card hover:bg-muted')}>
            <Share2 className="h-4 w-4" aria-hidden="true" />
            {t('postedCup.link.share')}
          </button>
        )}
        <button type="button" onClick={() => void copy()} className={cn(buttonBase, 'border border-input bg-card hover:bg-muted')}>
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? t('postedCup.link.copied') : t('postedCup.link.copy')}
        </button>
      </div>
    </div>
  );
}
