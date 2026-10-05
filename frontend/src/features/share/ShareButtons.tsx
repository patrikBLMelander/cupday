import { Check, ClipboardCopy, Link2, MessageCircle, Share2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { fullMessage, whatsappUrl, type ShareContent } from '@/features/share/shareText';
import { cn } from '@/lib/cn';

const button =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** WhatsApp, the native share sheet (where available) and copy-link for a match or cup. */
export function ShareButtons({ content, className }: { content: ShareContent; className?: string }): JSX.Element {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<'link' | 'text' | null>(null);
  const canShare = typeof navigator.share === 'function';

  async function copy(what: 'link' | 'text'): Promise<void> {
    try {
      await navigator.clipboard.writeText(what === 'link' ? content.url : fullMessage(content));
      setCopied(what);
    } catch {
      setCopied(null);
    }
  }

  async function share(): Promise<void> {
    try {
      await navigator.share({ title: content.title, text: fullMessage(content) });
    } catch {
      // Share sheet dismissed.
    }
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      <a
        href={whatsappUrl(content)}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(button, 'bg-[#0f7a6c] text-white hover:bg-[#0b6156]')}
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        {t('share.whatsapp')}
      </a>
      {canShare && (
        <button type="button" onClick={() => void share()} className={cn(button, 'border border-input bg-card hover:bg-muted')}>
          <Share2 className="h-4 w-4" aria-hidden="true" />
          {t('share.native')}
        </button>
      )}
      <button type="button" onClick={() => void copy('text')} className={cn(button, 'border border-input bg-card hover:bg-muted')}>
        {copied === 'text' ? <Check className="h-4 w-4" aria-hidden="true" /> : <ClipboardCopy className="h-4 w-4" aria-hidden="true" />}
        {copied === 'text' ? t('share.copiedText') : t('share.copyText')}
      </button>
      <button type="button" onClick={() => void copy('link')} className={cn(button, 'border border-input bg-card hover:bg-muted')}>
        {copied === 'link' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
        {copied === 'link' ? t('share.copied') : t('share.copy')}
      </button>
    </div>
  );
}

/** Prominent "share it now" card shown right after posting. */
export function ShareCard({ content, title, body }: { content: ShareContent; title: string; body: string }): JSX.Element {
  return (
    <section aria-label={title} className="rounded-2xl border-2 border-[#0f7a6c] bg-card p-5">
      <h2 className="inline-flex items-center gap-2 font-display text-xl font-extrabold">
        <MessageCircle className="h-5 w-5 text-[#0f7a6c]" aria-hidden="true" />
        {title}
      </h2>
      <p className="mb-3 mt-1 text-sm text-muted-foreground">{body}</p>
      <pre className="mb-3 whitespace-pre-wrap rounded-xl bg-secondary p-3 font-sans text-sm">{fullMessage(content)}</pre>
      <ShareButtons content={content} />
    </section>
  );
}
