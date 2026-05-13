import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useListMatchesByCupQuery } from '@/features/schedule/scheduleApi';
import type { Match } from '@/features/schedule/scheduleTypes';
import { useListPublicTeamsByCupQuery } from '@/features/teams/teamsApi';

type View = 'group' | 'pitch';
type Filter = 'all' | string;

type Translator = (key: string, opts?: Record<string, string | number>) => string;

export function PublicScheduleView({ cupId }: { cupId: string }): JSX.Element {
  const { t, i18n } = useTranslation();
  const { data: matches = [], isLoading } = useListMatchesByCupQuery(cupId);
  const { data: teams = [] } = useListPublicTeamsByCupQuery(cupId);
  const [view, setView] = useState<View>('group');
  const [filter, setFilter] = useState<Filter>('all');
  const [teamId, setTeamId] = useState<string>('all');

  const teamNameMap = useMemo(
    () => new Map(teams.map((team) => [team.id, team.name])),
    [teams],
  );

  const pitchOptions = useMemo(() => {
    const seen = new Set<number>();
    for (const m of matches) seen.add(m.pitch);
    return [...seen].sort((a, b) => a - b);
  }, [matches]);

  const visibleMatches = useMemo(() => {
    return matches.filter((m) => {
      if (teamId !== 'all' && m.homeTeamId !== teamId && m.awayTeamId !== teamId) {
        return false;
      }
      if (filter !== 'all') {
        if (view === 'group' && m.groupLabel !== filter) return false;
        if (view === 'pitch' && m.pitch !== Number(filter)) return false;
      }
      return true;
    });
  }, [matches, view, filter, teamId]);

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

  function changeView(next: View): void {
    setView(next);
    setFilter('all');
  }

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
      <div className="flex flex-col gap-1">
        <Label htmlFor="schedule-team-filter" className="text-xs uppercase tracking-wider text-muted-foreground">
          {t('public.schedule.teamFilterLabel')}
        </Label>
        <select
          id="schedule-team-filter"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="all">{t('public.schedule.allTeams')}</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      <ViewToggle view={view} setView={changeView} t={t} />
      <FilterBar
        view={view}
        filter={filter}
        setFilter={setFilter}
        pitches={pitchOptions}
        t={t}
      />

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

function ViewToggle({
  view,
  setView,
  t,
}: {
  view: View;
  setView: (next: View) => void;
  t: Translator;
}): JSX.Element {
  const options: Array<{ value: View; key: string }> = [
    { value: 'group', key: 'public.schedule.viewByGroup' },
    { value: 'pitch', key: 'public.schedule.viewByPitch' },
  ];
  return (
    <nav aria-label="View" className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <Button
          key={opt.value}
          type="button"
          size="sm"
          variant={view === opt.value ? 'default' : 'outline'}
          aria-pressed={view === opt.value}
          onClick={() => setView(opt.value)}
        >
          {t(opt.key)}
        </Button>
      ))}
    </nav>
  );
}

function FilterBar({
  view,
  filter,
  setFilter,
  pitches,
  t,
}: {
  view: View;
  filter: Filter;
  setFilter: (value: Filter) => void;
  pitches: number[];
  t: Translator;
}): JSX.Element {
  const options: Array<{ value: Filter; label: string }> =
    view === 'group'
      ? [
          { value: 'all', label: t('public.schedule.filterAll') },
          { value: 'A', label: t('public.schedule.filterGroupA') },
          { value: 'B', label: t('public.schedule.filterGroupB') },
        ]
      : [
          { value: 'all', label: t('public.schedule.filterAll') },
          ...pitches.map((p) => ({
            value: String(p),
            label: t('public.schedule.pitchLabel', { n: p }),
          })),
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
          {opt.label}
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
