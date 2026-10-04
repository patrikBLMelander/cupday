import { LayoutGrid, List, SlidersHorizontal, Search, Trophy } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useListPublicCupsQuery } from '@/features/cups/cupsApi';
import type { Cup } from '@/features/cups/cupTypes';
import { CupDayRow, CupFeedCard } from '@/features/postedCups/CupFeedItems';
import { ownedCupIds } from '@/features/postedCups/cupTokens';
import { DateStrip } from '@/features/practiceMatches/DateStrip';
import { FilterControls, FilterSheet, OnlyFreeToggle } from '@/features/practiceMatches/MatchFilters';
import { MatchCard, MatchCompactCard, MatchRow } from '@/features/practiceMatches/MatchListItems';
import { ownedMatchIds, readTeamQuery, saveTeamQuery } from '@/features/practiceMatches/manageTokens';
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  availableAgeKeys,
  countByDay,
  cupDays,
  filterCups,
  filterMatches,
  groupByDay,
  matchRole,
  nextBookableId,
  WINDOW_DAYS,
  WINDOW_STEP_DAYS,
  addDays,
  localDateKey,
  startOfDay,
  toFeedItems,
  upcomingDays,
  windowRange,
  type DayGroup,
  type FeedKind,
  type MatchFilters,
} from '@/features/practiceMatches/practiceMatchFeed';
import { formatLongDate, parseDateKey, relativeDayLabel } from '@/features/practiceMatches/practiceMatchFormat';
import {
  useListPracticeMatchesQuery,
  usePracticeMatchesPrefetch,
} from '@/features/practiceMatches/practiceMatchesApi';
import type { PracticeMatch } from '@/features/practiceMatches/practiceMatchTypes';
import { useIsDesktop } from '@/features/practiceMatches/useIsDesktop';
import { cn } from '@/lib/cn';

type ViewMode = 'list' | 'cards';

export function PracticeMatchListPage(): JSX.Element {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [windowStart, setWindowStart] = useState<Date>(today);
  const range = useMemo(() => windowRange(windowStart), [windowStart]);
  // `data` keeps the previous window's result while the next one loads, so paging doesn't flash empty.
  const { data: matches, isLoading, isFetching, isError } = useListPracticeMatchesQuery(range);
  const prefetch = usePracticeMatchesPrefetch('listPracticeMatches');
  const [filters, setFilters] = useState<MatchFilters>(() => ({ ...DEFAULT_FILTERS, teamQuery: readTeamQuery() }));
  const [view, setView] = useState<ViewMode>('list');
  const [sheetOpen, setSheetOpen] = useState(false);
  const ownedIds = useMemo(() => ownedMatchIds(), []);
  const ownedCups = useMemo(() => ownedCupIds(), []);
  const { data: cups } = useListPublicCupsQuery();

  const filteredItems = useMemo(
    () =>
      toFeedItems(
        filters.show === 'cups' ? [] : filterMatches(matches ?? [], filters, ownedIds),
        filterCups(cups ?? [], filters, ownedCups),
        { from: windowStart, to: addDays(windowStart, WINDOW_DAYS) },
      ),
    [matches, cups, filters, ownedIds, ownedCups, windowStart],
  );
  const cupDayKeys = useMemo(() => cupDays(filteredItems), [filteredItems]);
  const groups = useMemo(() => groupByDay(filteredItems, filters.date), [filteredItems, filters.date]);
  const counts = useMemo(() => countByDay(filteredItems), [filteredItems]);
  const nextId = useMemo(() => nextBookableId(filteredItems), [filteredItems]);
  const ageOptions = useMemo(
    () => [...new Set([...availableAgeKeys(matches ?? []), ...(cups ?? []).flatMap((c) => c.ageClasses ?? [])])].sort(),
    [matches, cups],
  );
  const days = useMemo(() => upcomingDays(windowStart), [windowStart]);
  const canGoBack = windowStart.getTime() > today.getTime();
  const ownMatches = useMemo(
    () => (matches ?? []).filter((m) => ownedIds.has(m.id)),
    [matches, ownedIds],
  );
  const ownCups = useMemo(() => (cups ?? []).filter((c) => ownedCups.has(c.id)), [cups, ownedCups]);
  const visibleCount = groups.reduce((sum, g) => sum + g.items.length, 0);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  function moveWindow(days: number): void {
    const next = addDays(windowStart, days);
    setWindowStart(next.getTime() < today.getTime() ? today : next);
    setFilters((prev) => ({ ...prev, date: null }));
  }

  function jumpTo(dateKey: string): void {
    const [year, month, day] = dateKey.split('-').map(Number);
    const picked = new Date(year, month - 1, day);
    const lastVisible = addDays(windowStart, WINDOW_DAYS - 1);
    if (picked < windowStart || picked > lastVisible) {
      setWindowStart(picked.getTime() < today.getTime() ? today : picked);
    }
    setFilters((prev) => ({ ...prev, date: localDateKey(picked) }));
  }

  function changeTeamQuery(teamQuery: string): void {
    setFilters((prev) => ({ ...prev, teamQuery }));
    saveTeamQuery(teamQuery);
  }

  const effectiveView: ViewMode | 'compact' = isDesktop ? view : 'compact';
  const filterCount = activeFilterCount(filters);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-4xl font-extrabold leading-none tracking-tight sm:text-5xl">
          {t('practice.list.heroLead')} <span className="text-accent-foreground">{t('practice.list.heroAccent')}</span>
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">{t('practice.list.heroSub')}</p>
      </div>

      <div className="flex min-h-12 items-center gap-2 rounded-2xl border border-border bg-card px-4">
        <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <label htmlFor="practice-team-query" className="sr-only">
          {t('practice.list.teamSearchLabel')}
        </label>
        <input
          id="practice-team-query"
          type="search"
          value={filters.teamQuery}
          onChange={(e) => changeTeamQuery(e.target.value)}
          placeholder={t('practice.list.teamSearchPlaceholder')}
          className="min-w-0 flex-1 bg-transparent py-3 outline-none placeholder:text-muted-foreground"
        />
      </div>

      <DateStrip
        days={days}
        counts={counts}
        selected={filters.date}
        onSelect={(date) => setFilters((prev) => ({ ...prev, date }))}
        onPrev={() => moveWindow(-WINDOW_STEP_DAYS)}
        onNext={() => moveWindow(WINDOW_STEP_DAYS)}
        onNextIntent={() => prefetch(windowRange(addDays(windowStart, WINDOW_STEP_DAYS)))}
        canGoBack={canGoBack}
        onPickDate={jumpTo}
        cupDays={cupDayKeys}
      />

      {isDesktop ? (
        <div className="flex flex-wrap items-center gap-3 rounded-[20px] border border-border bg-card p-3">
          <KindToggle value={filters.show} onChange={(show) => setFilters((prev) => ({ ...prev, show }))} />
          <span aria-hidden="true" className="h-7 w-px bg-border" />
          <FilterControls filters={filters} onChange={setFilters} ageOptions={ageOptions} layout="bar" />
          <div className="flex-1" />
          <ViewToggle view={view} onChange={setView} />
        </div>
      ) : (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
          <KindToggle value={filters.show} onChange={(show) => setFilters((prev) => ({ ...prev, show }))} />
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-input bg-card px-4 font-bold"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            {t('practice.list.filters')}
            {filterCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs text-primary-foreground">
                {filterCount}
              </span>
            )}
          </button>
          <OnlyFreeToggle
            checked={filters.onlyFree}
            onChange={(onlyFree) => setFilters((prev) => ({ ...prev, onlyFree }))}
          />
        </div>
      )}

      {(ownMatches.length > 0 || ownCups.length > 0) && <OwnMatches matches={ownMatches} cups={ownCups} />}

      {isLoading && (
        <p role="status" aria-live="polite" className="text-muted-foreground">
          {t('common.loading')}
        </p>
      )}
      {isError && (
        <p role="alert" className="rounded-xl border border-destructive/40 p-4 text-destructive">
          {t('practice.list.loadError')}
        </p>
      )}
      {!isLoading && !isError && !isFetching && groups.length === 0 && (
        <div className="rounded-[20px] border border-dashed border-input px-6 py-12 text-center">
          <p className="text-lg font-bold">
            {filters.date ? t('practice.list.emptyDay') : t('practice.list.empty')}
          </p>
          <p className="mt-1 text-muted-foreground">{t('practice.list.emptyHint')}</p>
        </div>
      )}

      <div aria-busy={isFetching} className={cn('flex flex-col gap-5 transition-opacity', isFetching && 'opacity-50')}>
        {groups.map((group) => (
          <DaySection
            key={group.dateKey}
            group={group}
            view={effectiveView}
            nextId={nextId}
            teamQuery={filters.teamQuery}
            ownedIds={ownedIds}
          />
        ))}
      </div>

      <FilterSheet
        open={sheetOpen && !isDesktop}
        onClose={closeSheet}
        filters={filters}
        onChange={setFilters}
        ageOptions={ageOptions}
        resultCount={visibleCount}
      />
    </div>
  );
}

function KindToggle({ value, onChange }: { value: FeedKind; onChange: (value: FeedKind) => void }): JSX.Element {
  const { t } = useTranslation();
  const options: Array<{ value: FeedKind; label: string }> = [
    { value: 'all', label: t('postedCup.feed.showAll') },
    { value: 'matches', label: t('postedCup.feed.showMatches') },
    { value: 'cups', label: t('postedCup.feed.showCups') },
  ];
  return (
    <div role="group" aria-label={t('postedCup.feed.show')} className="flex shrink-0 gap-1 rounded-xl bg-secondary p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            'inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            value === option.value ? 'bg-card font-extrabold text-foreground shadow-sm' : 'text-muted-foreground',
          )}
        >
          {option.value === 'cups' && <Trophy className="h-3.5 w-3.5" aria-hidden="true" />}
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (view: ViewMode) => void }): JSX.Element {
  const { t } = useTranslation();
  const options: Array<{ value: ViewMode; label: string; icon: JSX.Element }> = [
    { value: 'list', label: t('practice.list.viewList'), icon: <List className="h-4 w-4" aria-hidden="true" /> },
    { value: 'cards', label: t('practice.list.viewCards'), icon: <LayoutGrid className="h-4 w-4" aria-hidden="true" /> },
  ];
  return (
    <div role="group" aria-label={t('practice.list.view')} className="flex gap-1 rounded-xl bg-secondary p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={view === option.value}
          className={cn(
            'inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            view === option.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

interface DaySectionProps {
  group: DayGroup;
  view: ViewMode | 'compact';
  nextId: string | null;
  teamQuery: string;
  ownedIds: ReadonlySet<string>;
}

function DaySection({ group, view, nextId, teamQuery, ownedIds }: DaySectionProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'sv';
  const relative = relativeDayLabel(t, group.dateKey);
  const items = group.items.flatMap((item) =>
    item.kind === 'match'
      ? [{ match: item.match, role: matchRole(item.match, teamQuery, ownedIds), isNext: item.match.id === nextId }]
      : [],
  );
  const cupStarts = group.items.flatMap((item) => (item.kind === 'cup' ? [item.cup] : []));
  const cupContinuations = group.items.flatMap((item) => (item.kind === 'cupDay' ? [item] : []));
  const countText = [
    cupStarts.length > 0 ? t('postedCup.feed.cupCount', { count: cupStarts.length }) : '',
    items.length > 0 ? t('practice.list.matchCount', { count: items.length }) : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section aria-labelledby={`day-${group.dateKey}`}>
      <h2 id={`day-${group.dateKey}`} className="mb-3 flex flex-wrap items-baseline gap-2 font-display text-xl font-bold sm:text-2xl">
        {relative && <span className="text-accent-foreground">{relative}</span>}
        <span>{formatLongDate(parseDateKey(group.dateKey), locale)}</span>
        <span className="font-sans text-sm font-semibold text-muted-foreground">{countText}</span>
      </h2>
      {(cupStarts.length > 0 || cupContinuations.length > 0) && (
        <div className="mb-2.5 flex flex-col gap-2.5">
          {cupStarts.map((cup) => (
            <CupFeedCard key={cup.id} cup={cup} />
          ))}
          {cupContinuations.map((item) => (
            <CupDayRow key={`${item.cup.id}-${item.day}`} cup={item.cup} day={item.day} days={item.days} />
          ))}
        </div>
      )}
      {items.length > 0 && view === 'list' && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <ul>
            {items.map((props) => (
              <MatchRow key={props.match.id} {...props} />
            ))}
          </ul>
        </div>
      )}
      {items.length > 0 && view === 'cards' && (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
          {items.map((props) => (
            <MatchCard key={props.match.id} {...props} />
          ))}
        </ul>
      )}
      {items.length > 0 && view === 'compact' && (
        <ul className="flex flex-col gap-2">
          {items.map((props) => (
            <MatchCompactCard key={props.match.id} {...props} />
          ))}
        </ul>
      )}
    </section>
  );
}

function OwnMatches({ matches, cups }: { matches: PracticeMatch[]; cups: Cup[] }): JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'sv';
  return (
    <section aria-labelledby="own-matches" className="rounded-2xl border border-border bg-card p-4">
      <h2 id="own-matches" className="mb-2 font-display text-lg font-bold">
        {t('practice.list.yourPosts')}
      </h2>
      <ul className="flex flex-col gap-1">
        {matches.map((match) => (
          <li key={match.id} className="flex flex-wrap items-center gap-x-3">
            <span className="font-semibold">{match.teamName}</span>
            <span className="text-sm text-muted-foreground">{formatLongDate(match.kickoffAt, locale)}</span>
            <Link to={`/matcher/${match.id}/hantera`} className="inline-flex min-h-11 items-center font-bold text-accent-foreground hover:underline">
              {t('practice.list.manage')}
            </Link>
          </li>
        ))}
        {cups.map((cup) => (
          <li key={cup.id} className="flex flex-wrap items-center gap-x-3">
            <Trophy className="h-4 w-4 text-amber-700 dark:text-amber-400" aria-hidden="true" />
            <span className="font-semibold">{cup.name}</span>
            <span className="text-sm text-muted-foreground">{formatLongDate(`${cup.startDate}T00:00:00`, locale)}</span>
            <Link to={`/matcher/cup/${cup.id}/hantera`} className="inline-flex min-h-11 items-center font-bold text-accent-foreground hover:underline">
              {t('postedCup.feed.manageCup')}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
