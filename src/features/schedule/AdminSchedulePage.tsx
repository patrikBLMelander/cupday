import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGetCupQuery } from '@/features/cups/cupsApi';
import {
  useGenerateScheduleMutation,
  useListMatchesByCupQuery,
  useUpdateMatchMutation,
} from '@/features/schedule/scheduleApi';
import type { Match, Pitch } from '@/features/schedule/scheduleTypes';
import { useListAdminTeamsByCupQuery } from '@/features/teams/teamsApi';
import type { Team } from '@/features/teams/teamTypes';

const TEAMS_PER_GROUP = 4;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function defaultStartTime(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  return `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(
    tomorrow.getDate(),
  )}T${pad(tomorrow.getHours())}:${pad(tomorrow.getMinutes())}`;
}

function isoToDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function AdminSchedulePage(): JSX.Element {
  const { t } = useTranslation();
  const { id = '' } = useParams<{ id: string }>();
  const { data: cup } = useGetCupQuery(id, { skip: !id });
  const { data: teams = [] } = useListAdminTeamsByCupQuery(id, { skip: !id });
  const { data: matches = [] } = useListMatchesByCupQuery(id, { skip: !id });
  const [generateSchedule, { isLoading: isGenerating }] =
    useGenerateScheduleMutation();
  const [updateMatch] = useUpdateMatchMutation();

  const [startTime, setStartTime] = useState<string>(defaultStartTime);
  const [duration, setDuration] = useState<number>(15);
  const [breakMin, setBreakMin] = useState<number>(5);
  const [genError, setGenError] = useState<string | null>(null);

  const paidA = teams.filter(
    (t) => t.status === 'paid' && t.groupLabel === 'A',
  ).length;
  const paidB = teams.filter(
    (t) => t.status === 'paid' && t.groupLabel === 'B',
  ).length;
  const requirementsMet = paidA === TEAMS_PER_GROUP && paidB === TEAMS_PER_GROUP;

  const teamMap = useMemo(() => {
    const map = new Map<string, Team>();
    for (const team of teams) map.set(team.id, team);
    return map;
  }, [teams]);

  const hasCancelledInSchedule = useMemo(() => {
    return matches.some((m) => {
      const home = teamMap.get(m.homeTeamId);
      const away = teamMap.get(m.awayTeamId);
      return home?.status === 'cancelled' || away?.status === 'cancelled';
    });
  }, [matches, teamMap]);

  async function handleGenerate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!cup) return;
    setGenError(null);
    try {
      await generateSchedule({
        cupId: cup.id,
        settings: {
          startTime: new Date(startTime).toISOString(),
          matchDurationMinutes: duration,
          breakBetweenMatchesMinutes: breakMin,
        },
      }).unwrap();
    } catch {
      setGenError(t('admin.schedule.errors.generationFailed'));
    }
  }

  function handleMatchTimeChange(match: Match, value: string): void {
    if (!cup) return;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return;
    void updateMatch({
      id: match.id,
      cupId: cup.id,
      patch: { startTime: parsed.toISOString() },
    });
  }

  function handleMatchPitchChange(match: Match, value: string): void {
    if (!cup) return;
    const pitch: Pitch = value === '2' ? 2 : 1;
    void updateMatch({ id: match.id, cupId: cup.id, patch: { pitch } });
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
          <Link to={cup ? `/admin/cups/${cup.id}` : '/admin'}>
            ← {t('admin.schedule.backToSettings')}
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('admin.schedule.title')}
          {cup && (
            <span className="ml-2 text-base font-normal text-muted-foreground">
              {cup.name}
            </span>
          )}
        </h1>
      </div>

      {!requirementsMet && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('admin.schedule.requirements.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>{t('admin.schedule.requirements.body')}</p>
            <p className="text-muted-foreground">
              {t('admin.schedule.requirements.currentCounts', {
                a: paidA,
                b: paidB,
              })}
            </p>
            <Button asChild variant="outline" size="sm" className="self-start">
              <Link to={`/admin/cups/${id}/teams`}>
                {t('admin.schedule.requirements.manageTeamsLink')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {requirementsMet && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('admin.schedule.settings.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <Label htmlFor="startTime">
                  {t('admin.schedule.settings.startTime')}
                </Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="matchDuration">
                  {t('admin.schedule.settings.matchDuration')}
                </Label>
                <Input
                  id="matchDuration"
                  type="number"
                  min={1}
                  max={120}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="breakDuration">
                  {t('admin.schedule.settings.breakDuration')}
                </Label>
                <Input
                  id="breakDuration"
                  type="number"
                  min={0}
                  max={60}
                  value={breakMin}
                  onChange={(e) => setBreakMin(Number(e.target.value))}
                />
              </div>
              {genError && (
                <p
                  role="alert"
                  className="text-sm text-destructive sm:col-span-2"
                >
                  {genError}
                </p>
              )}
              <div className="sm:col-span-2">
                <Button type="submit" disabled={isGenerating}>
                  {matches.length > 0
                    ? t('admin.schedule.settings.regenerateCta')
                    : t('admin.schedule.settings.generateCta')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('admin.schedule.matchList.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {matches.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t('admin.schedule.matchList.empty')}
            </p>
          )}
          {hasCancelledInSchedule && (
            <p className="text-sm text-destructive">
              {t('admin.schedule.matchList.cancelledHint')}
            </p>
          )}
          {matches.length > 0 && (
            <ul className="flex flex-col gap-2">
              {matches.map((match) => (
                <MatchRow
                  key={match.id}
                  match={match}
                  homeName={teamMap.get(match.homeTeamId)?.name ?? '?'}
                  awayName={teamMap.get(match.awayTeamId)?.name ?? '?'}
                  onTimeChange={(v) => handleMatchTimeChange(match, v)}
                  onPitchChange={(v) => handleMatchPitchChange(match, v)}
                  t={t}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MatchRow({
  match,
  homeName,
  awayName,
  onTimeChange,
  onPitchChange,
  t,
}: {
  match: Match;
  homeName: string;
  awayName: string;
  onTimeChange: (value: string) => void;
  onPitchChange: (value: string) => void;
  t: (k: string, opts?: Record<string, string | number>) => string;
}): JSX.Element {
  return (
    <li className="rounded border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <span className="font-medium">{homeName}</span>{' '}
          <span className="text-muted-foreground">
            {t('admin.schedule.matchList.vs')}
          </span>{' '}
          <span className="font-medium">{awayName}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {t('admin.schedule.matchList.groupLabel', { group: match.groupLabel })}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="datetime-local"
            defaultValue={isoToDateTimeLocal(match.startTime)}
            onBlur={(e) => onTimeChange(e.target.value)}
            className="h-8 w-44 text-xs"
            aria-label={t('admin.schedule.settings.startTime')}
          />
          <select
            defaultValue={String(match.pitch)}
            onChange={(e) => onPitchChange(e.target.value)}
            className="h-8 rounded border border-input bg-background px-2 text-xs"
            aria-label={t('admin.schedule.matchList.pitchLabel', { pitch: '' })}
          >
            <option value="1">{t('admin.schedule.matchList.pitchLabel', { pitch: 1 })}</option>
            <option value="2">{t('admin.schedule.matchList.pitchLabel', { pitch: 2 })}</option>
          </select>
        </div>
      </div>
    </li>
  );
}
