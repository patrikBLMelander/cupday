import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatLabel, formatLongDate, formatTimeRange, matchAgeLabel } from '@/features/practiceMatches/practiceMatchFormat';
import {
  useAdminDeletePracticeMatchMutation,
  useAdminListPracticeMatchesQuery,
} from '@/features/practiceMatches/practiceMatchesApi';
import type { PracticeMatch } from '@/features/practiceMatches/practiceMatchTypes';

/** Admin moderation of the public practice-match board: search, review contact details, delete spam. */
export function AdminPracticeMatchesPage(): JSX.Element {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const { data, isLoading, isError, isFetching } = useAdminListPracticeMatchesQuery({ q: query, page });

  function search(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setQuery(draft.trim());
    setPage(0);
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t('admin.practiceMatches.title')}</h1>

      <form onSubmit={search} role="search" className="flex gap-2">
        <label htmlFor="admin-pm-search" className="sr-only">
          {t('admin.practiceMatches.searchLabel')}
        </label>
        <Input
          id="admin-pm-search"
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('admin.practiceMatches.searchLabel')}
        />
        <Button type="submit">{t('admin.practiceMatches.search')}</Button>
      </form>

      {isLoading && (
        <p role="status" aria-live="polite" className="text-muted-foreground">
          {t('common.loading')}
        </p>
      )}
      {isError && (
        <p role="alert" className="text-sm text-destructive">
          {t('admin.practiceMatches.loadFailed')}
        </p>
      )}
      {data && (
        <p className="text-sm text-muted-foreground">
          {t('admin.practiceMatches.total', { count: data.totalElements })}
        </p>
      )}
      {data && data.items.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">{t('admin.practiceMatches.empty')}</CardContent>
        </Card>
      )}

      <ul aria-busy={isFetching} className="flex flex-col gap-3">
        {data?.items.map((match) => (
          <AdminMatchItem key={match.id} match={match} />
        ))}
      </ul>

      {data && data.totalPages > 1 && (
        <nav className="flex items-center justify-between gap-3">
          <Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
            {t('admin.practiceMatches.prev')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('admin.practiceMatches.pageOf', { page: page + 1, total: data.totalPages })}
          </span>
          <Button variant="outline" disabled={page + 1 >= data.totalPages} onClick={() => setPage(page + 1)}>
            {t('admin.practiceMatches.next')}
          </Button>
        </nav>
      )}
    </div>
  );
}

function AdminMatchItem({ match }: { match: PracticeMatch }): JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'sv';
  const [confirming, setConfirming] = useState(false);
  const [deleteMatch, { isLoading }] = useAdminDeletePracticeMatchMutation();
  const isActive = match.status === 'active';

  return (
    <li>
      <Card>
        <CardContent className="flex flex-col gap-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold">{match.teamName}</span>
            <Badge variant={isActive ? 'secondary' : 'outline'}>
              {isActive ? t('admin.practiceMatches.statusActive') : t('admin.practiceMatches.statusCancelled')}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {matchAgeLabel(match)} · {formatLabel(t, match.playersPerSide)}
            </span>
          </div>
          <div className="text-sm">
            {formatLongDate(match.kickoffAt, locale)} {formatTimeRange(match.kickoffAt, match.endsAt, locale)} · {match.venue}
          </div>
          <div className="text-sm text-muted-foreground">
            {match.contactName} · {match.contactPhone} · {match.contactEmail}
          </div>
          <div className="text-sm text-muted-foreground">
            {t('admin.practiceMatches.posted', { date: formatLongDate(match.createdAt, locale) })} ·{' '}
            {t('admin.practiceMatches.bookings', {
              booked: match.opponentSlots - match.freeSlots,
              slots: match.opponentSlots,
            })}
          </div>
          {match.notes && <p className="whitespace-pre-line text-sm">{match.notes}</p>}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button asChild variant="outline" size="sm">
              <a href={`/matcher/${match.id}`} target="_blank" rel="noreferrer">
                {t('admin.practiceMatches.view')}
              </a>
            </Button>
            {confirming ? (
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => void deleteMatch(match.id)}
                >
                  {t('admin.practiceMatches.confirmDelete')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                  {t('admin.practiceMatches.keep')}
                </Button>
                <span className="text-xs text-muted-foreground">{t('admin.practiceMatches.deleteHint')}</span>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
                {t('admin.practiceMatches.delete')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
