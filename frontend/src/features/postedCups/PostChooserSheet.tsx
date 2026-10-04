import { CircleDot, Trophy, X } from 'lucide-react';
import { useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

/** Mobile bottom sheet: "What do you want to post?" — practice match or cup. */
export function PostChooserSheet({ open, onClose }: { open: boolean; onClose: () => void }): JSX.Element | null {
  const { t } = useTranslation();
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40">
      <button type="button" aria-label={t('practice.list.close')} tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-black/45" />
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="absolute inset-x-0 bottom-0 flex flex-col gap-3 rounded-t-3xl bg-card px-5 pb-7 pt-3">
        <span aria-hidden="true" className="mx-auto h-1 w-10 rounded bg-input" />
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="font-display text-2xl font-extrabold">
            {t('postedCup.chooser.title')}
          </h2>
          <button type="button" onClick={onClose} aria-label={t('practice.list.close')} className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <Link to="/matcher/ny" onClick={onClose} className="flex items-center gap-4 rounded-2xl border-2 border-primary bg-accent p-4">
          <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <CircleDot className="h-6 w-6" />
          </span>
          <span>
            <span className="block font-display text-lg font-extrabold">{t('postedCup.chooser.match')}</span>
            <span className="text-sm text-muted-foreground">{t('postedCup.chooser.matchBody')}</span>
          </span>
        </Link>
        <Link to="/matcher/ny-cup" onClick={onClose} className="flex items-center gap-4 rounded-2xl border-2 border-amber-700 bg-amber-50 p-4 dark:bg-amber-950/40">
          <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-800 text-white">
            <Trophy className="h-6 w-6" />
          </span>
          <span>
            <span className="block font-display text-lg font-extrabold">{t('postedCup.chooser.cup')}</span>
            <span className="text-sm text-muted-foreground">{t('postedCup.chooser.cupBody')}</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
