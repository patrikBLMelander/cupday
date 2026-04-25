import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useListMatchesByCupQuery } from '@/features/schedule/scheduleApi';
import type { Match } from '@/features/schedule/scheduleTypes';
import { useListPublicTeamsByCupQuery } from '@/features/teams/teamsApi';

type Filter = 'all' | 'A' | 'B';

type Translator = (key: string, opts?: Record<string, string | number>) => string;

export function PublicScheduleView({ cupId }: { cupId: string }): JSX.Element {
  const { t, i18n } = useTranslation();
  const { data: matches = [], isLoading } = useListMatchesByCupQuery(cupId);
  const { data: teams = [] } = useListPublicTeamsByCupQuery(cupId);
  const [filter, setFilter] = useState<Filter>('all');

  const teamNameMap = useMemo(
    () => new Map(teams.map((team) => [team.id, team.name])),
    [teams],
  );

  const visibleMatches =
    filter === 'all' ? matches : matches.filter((m) => m.groupLabel === filter);

  const slots = useMemo(() => {
    const groups = new Map<string, Match[]>();
    for (const match of visibleMatches) {
      const bucket = groups.get(match.startTime);
      if (bucket) {
        bucket.push(match);
      } else {
        groups.set(match.startTime, [match]);
      }
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [visibleMatches]);

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.resolvedLanguage ?? 'sv', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    [i18n.resolvedLanguage],
  );

  if (isLoading) {
    return (
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {t('common.loading')}
      </p>
    );
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          {t('public.schedule.empty')}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <FilterBar filter={filter} setFilter={setFilter} t={t} />
      {slots.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            {t('public.schedule.emptyForFilter')}
          </CardContent>
        </Card>
      )}
      {slots.map(([slotKey, slotMatches]) => (
        <SlotRow
          key={slotKey}
          time={timeFormatter.format(new Date(slotKey))}
          matches={slotMatches}
          teamNameMap={teamNameMap}
          t={t}
        />
      ))}
    </div>
  );
}

function FilterBar({
  filter,
  setFilter,
  t,
}: {
  filter: Filter;
  setFilter: (value: Filter) => void;
  t: Translator;
}): JSX.Element {
  const options: Array<{ value: Filter; key: string }> = [
    { value: 'all', key: 'public.schedule.filterAll' },
    { value: 'A', key: 'public.schedule.filterGroupA' },
    { value: 'B', key: 'public.schedule.filterGroupB' },
  ];
  return (
    <nav aria-label="Filter" className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <Button
          key={opt.value}
          type="button"
          size="sm"
          variant={filter === opt.value ? 'default' : 'outline'}
          aria-pressed={filter === opt.value}
          onClick={() => setFilter(opt.value)}
        >
          {t(opt.key)}
        </Button>
      ))}
    </nav>
  );
}

function SlotRow({
  time,
  matches,
  teamNameMap,
  t,
}: {
  time: string;
  matches: Match[];
  teamNameMap: Map<string, string>;
  t: Translator;
}): JSX.Element {
  const sorted = [...matches].sort((a, b) => a.pitch - b.pitch);
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground">
        {time}
      </h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {sorted.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            home={teamNameMap.get(match.homeTeamId) ?? '?'}
            away={teamNameMap.get(match.awayTeamId) ?? '?'}
            t={t}
          />
        ))}
      </div>
    </section>
  );
}

function MatchCard({
  match,
  home,
  away,
  t,
}: {
  match: Match;
  home: string;
  away: string;
  t: Translator;
}): JSX.Element {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t('public.schedule.pitchLabel', { n: match.pitch })}</span>
          <Badge variant="secondary">
            {t('public.schedule.groupBadge', { label: match.groupLabel })}
          </Badge>
        </div>
        <div className="text-sm">
          <span className="font-medium">{home}</span>{' '}
          <span className="text-muted-foreground">
            {t('public.schedule.vs')}
          </span>{' '}
          <span className="font-medium">{away}</span>
        </div>
      </CardContent>
    </Card>
  );
}
