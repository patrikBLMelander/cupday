import {
  Car,
  MapPin,
  Toilet,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useOutletContext } from 'react-router-dom';

import type { PublicCupOutletContext } from '@/app/layouts/PublicLayout';
import { Countdown } from '@/components/Countdown';
import { PitchLines } from '@/components/PitchLines';
import { TeamAvatar } from '@/components/TeamAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Cup } from '@/features/cups/cupTypes';
import { PublicScheduleView } from '@/features/schedule/PublicScheduleView';
import { useListMatchesByCupQuery } from '@/features/schedule/scheduleApi';
import type { Match } from '@/features/schedule/scheduleTypes';
import { useListPublicTeamsByCupQuery } from '@/features/teams/teamsApi';
import type { PublicTeam } from '@/features/teams/teamTypes';

/** How long after kickoff we consider a match "still playing" without a duration column. */
const MATCH_LIVE_WINDOW_MS = 30 * 60_000;

export function PublicCupLandingPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { cup } = useOutletContext<PublicCupOutletContext>();
  const { data: publicTeams = [], isLoading: isLoadingTeams } =
    useListPublicTeamsByCupQuery(cup.id);
  const { data: matches = [] } = useListMatchesByCupQuery(cup.id);
  const now = useTickingNow(60_000);

  const teamMap = useMemo(
    () => new Map(publicTeams.map((team) => [team.id, team])),
    [publicTeams],
  );

  const { playedCount, nowPlaying, nextUp } = useMemo(
    () => deriveLiveStats(matches, now),
    [matches, now],
  );

  const dateFormatter = new Intl.DateTimeFormat(
    i18n.resolvedLanguage ?? 'sv',
    { day: 'numeric', month: 'short', year: 'numeric' },
  );
  const timeFormatter = new Intl.DateTimeFormat(
    i18n.resolvedLanguage ?? 'sv',
    { hour: '2-digit', minute: '2-digit' },
  );

  return (
    <div className="-mx-4 -mt-6 flex flex-col gap-6 sm:-mx-6">
      <CupHero
        cup={cup}
        dateFormatter={dateFormatter}
        playedCount={playedCount}
        totalMatches={matches.length}
        t={t}
      />

      {matches.length > 0 && (nowPlaying.length > 0 || nextUp) && (
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <LiveStrip
            nowPlaying={nowPlaying}
            nextUp={nextUp}
            teamMap={teamMap}
            timeFormatter={timeFormatter}
            t={t}
          />
        </div>
      )}

      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">{t('public.tabs.info')}</TabsTrigger>
            <TabsTrigger value="teams">{t('public.tabs.teams')}</TabsTrigger>
            <TabsTrigger value="schedule">{t('public.tabs.schedule')}</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="flex flex-col gap-4">
            <AmenitiesCard cup={cup} t={t} />

            {cup.paymentInstructions && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('public.info.paymentInstructions')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm">
                    {cup.paymentInstructions}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>{t('public.info.contactName')}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm">
                <p>{cup.organizerContactName}</p>
                {cup.organizerContactEmail && (
                  <p>
                    <a
                      href={`mailto:${cup.organizerContactEmail}`}
                      className="underline"
                    >
                      {cup.organizerContactEmail}
                    </a>
                  </p>
                )}
                {cup.organizerContactPhone && (
                  <p>
                    <a
                      href={`tel:${cup.organizerContactPhone}`}
                      className="underline"
                    >
                      {cup.organizerContactPhone}
                    </a>
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teams">
            {isLoadingTeams ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  {t('common.loading')}
                </CardContent>
              </Card>
            ) : publicTeams.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  {t('public.empty.teams')}
                </CardContent>
              </Card>
            ) : (
              <PublicTeamsList teams={publicTeams} t={t} />
            )}
          </TabsContent>

          <TabsContent value="schedule">
            <PublicScheduleView cupId={cup.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CupHero({
  cup,
  dateFormatter,
  playedCount,
  totalMatches,
  t,
}: {
  cup: Cup;
  dateFormatter: Intl.DateTimeFormat;
  playedCount: number;
  totalMatches: number;
  t: (key: string, opts?: Record<string, unknown>) => string;
}): JSX.Element {
  const primary = `hsl(${cup.organizingClubColors.primary})`;
  const accent = `hsl(${cup.organizingClubColors.accent})`;
  const initial = cup.organizingClubName.trim().charAt(0).toUpperCase() || '?';
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = Boolean(cup.clubLogoUrl) && !logoFailed;
  const remaining = Math.max(0, cup.maxTeams - cup.activeTeamCount);
  const filledPct = Math.min(
    100,
    Math.round((cup.activeTeamCount / Math.max(1, cup.maxTeams)) * 100),
  );
  const dateRange = `${dateFormatter.format(new Date(cup.startDate))} – ${dateFormatter.format(new Date(cup.endDate))}`;
  const cupStart = new Date(`${cup.startDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isUpcoming = cupStart.getTime() >= today.getTime();

  return (
    <section
      className="relative isolate overflow-hidden text-white"
      style={{
        backgroundImage: `linear-gradient(135deg, ${primary} 0%, color-mix(in oklab, ${primary} 70%, black) 100%)`,
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-black/0 via-transparent to-black/30"
      />
      <PitchLines
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 w-full text-white"
        style={{ height: '70%' }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full text-2xl font-semibold shadow-md ring-2 ring-white/40"
            style={{ backgroundColor: accent, color: primary }}
          >
            {showLogo ? (
              <img
                src={cup.clubLogoUrl}
                alt=""
                className="h-full w-full object-contain"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <span aria-hidden="true">{initial}</span>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium uppercase tracking-wider text-white/70">
              {cup.organizingClubName}
            </span>
            <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm sm:text-4xl">
              {cup.name}
            </h1>
          </div>
        </div>

        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/90">
          <HeroFact label={t('public.info.dates')} value={dateRange} />
          <HeroFact label={t('public.info.venue')} value={cup.venueName} />
          <HeroFact
            label={t('admin.cupForm.playersPerTeam')}
            value={t('landing.card.playersLabel', { n: cup.playersPerTeam })}
          />
          <HeroFact
            label={t('public.info.fee')}
            value={`${cup.registrationFeeSek} SEK`}
          />
        </dl>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-white/85">
            <span>
              {t('public.info.spotsLeft', {
                remaining,
                max: cup.maxTeams,
              })}
            </span>
            <span>{filledPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-500"
              style={{ width: `${filledPct}%` }}
            />
          </div>
          {totalMatches > 0 && (
            <p className="mt-1 text-xs font-medium text-white/80">
              {t('public.live.matchesPlayed', {
                played: playedCount,
                total: totalMatches,
              })}
            </p>
          )}
        </div>

        {isUpcoming && (
          <Countdown
            target={cupStart}
            label={t('landing.countdown.title')}
          />
        )}

        {cup.status === 'open' && remaining > 0 ? (
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="self-start text-base font-semibold shadow-lg"
          >
            <Link to={`/c/${cup.slug}/register`}>
              {t('public.info.registerCta')}
            </Link>
          </Button>
        ) : (
          <Badge variant="secondary" className="self-start">
            {t('public.info.registrationsClosed')}
          </Badge>
        )}
      </div>
    </section>
  );
}

function useTickingNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function deriveLiveStats(
  matches: Match[],
  now: number,
): { playedCount: number; nowPlaying: Match[]; nextUp: Match | null } {
  let playedCount = 0;
  const nowPlaying: Match[] = [];
  let nextUp: Match | null = null;
  for (const m of matches) {
    const start = Date.parse(m.startTime);
    if (Number.isNaN(start)) continue;
    if (start + MATCH_LIVE_WINDOW_MS <= now) {
      playedCount++;
    } else if (start <= now) {
      nowPlaying.push(m);
    } else if (!nextUp || start < Date.parse(nextUp.startTime)) {
      nextUp = m;
    }
  }
  nowPlaying.sort((a, b) => a.pitch - b.pitch);
  return { playedCount, nowPlaying, nextUp };
}

function LiveStrip({
  nowPlaying,
  nextUp,
  teamMap,
  timeFormatter,
  t,
}: {
  nowPlaying: Match[];
  nextUp: Match | null;
  teamMap: Map<string, PublicTeam>;
  timeFormatter: Intl.DateTimeFormat;
  t: (key: string, opts?: Record<string, unknown>) => string;
}): JSX.Element {
  const isLive = nowPlaying.length > 0;
  const matchesToShow = isLive ? nowPlaying : nextUp ? [nextUp] : [];
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          {isLive && (
            <span
              aria-hidden
              className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500"
            />
          )}
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isLive ? t('public.live.nowPlaying') : t('public.live.nextUp')}
          </span>
        </div>
        <ul className="flex flex-col gap-1.5">
          {matchesToShow.map((match) => {
            const home = teamMap.get(match.homeTeamId);
            const away = teamMap.get(match.awayTeamId);
            return (
              <li
                key={match.id}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
              >
                <Badge variant="secondary">
                  {t('public.schedule.pitchLabel', { n: match.pitch })}
                </Badge>
                <span className="flex items-center gap-1.5 font-medium">
                  {home && <TeamAvatar team={home} size="xs" />}
                  {home?.name ?? '?'}
                </span>
                <span className="text-muted-foreground">
                  {t('public.schedule.vs')}
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  {away && <TeamAvatar team={away} size="xs" />}
                  {away?.name ?? '?'}
                </span>
                {!isLive && (
                  <span className="text-xs text-muted-foreground">
                    · {timeFormatter.format(new Date(match.startTime))}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function AmenitiesCard({
  cup,
  t,
}: {
  cup: Cup;
  t: (key: string) => string;
}): JSX.Element | null {
  const items: { icon: LucideIcon; label: string; available: boolean }[] = [
    {
      icon: Toilet,
      label: t('public.info.amenityToilets'),
      available: cup.hasToilets,
    },
    {
      icon: Utensils,
      label: t('public.info.amenityFood'),
      available: cup.hasFood,
    },
    {
      icon: Car,
      label: t('public.info.amenityParking'),
      available: cup.hasParking,
    },
  ];
  const primary = `hsl(${cup.organizingClubColors.primary})`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle>{t('public.info.amenitiesTitle')}</CardTitle>
        {cup.mapUrl && (
          <Button asChild size="sm" variant="outline">
            <a
              href={cup.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5"
            >
              <MapPin className="h-4 w-4" aria-hidden />
              {t('public.info.getDirections')}
            </a>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-3 gap-3 text-center">
          {items.map(({ icon: Icon, label, available }) => (
            <li
              key={label}
              className="flex flex-col items-center gap-1"
              aria-label={
                available ? label : `${label} — ${t('public.info.amenityNotAvailable')}`
              }
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full ${available ? '' : 'opacity-30'}`}
                style={
                  available
                    ? { backgroundColor: primary, color: 'white' }
                    : { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }
                }
              >
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <span
                className={`text-xs ${available ? 'font-medium' : 'text-muted-foreground line-through'}`}
              >
                {label}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function HeroFact({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className="flex flex-col">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
        {label}
      </dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function PublicTeamsList({
  teams,
  t,
}: {
  teams: PublicTeam[];
  t: (k: string) => string;
}): JSX.Element {
  const groupA = teams.filter((team) => team.groupLabel === 'A');
  const groupB = teams.filter((team) => team.groupLabel === 'B');
  const unassigned = teams.filter((team) => team.groupLabel === null);

  return (
    <div className="flex flex-col gap-3">
      {groupA.length > 0 && (
        <TeamsGroup
          title={t('public.teamsList.groupA')}
          teams={groupA}
          t={t}
        />
      )}
      {groupB.length > 0 && (
        <TeamsGroup
          title={t('public.teamsList.groupB')}
          teams={groupB}
          t={t}
        />
      )}
      {unassigned.length > 0 && (
        <TeamsGroup
          title={t('public.teamsList.unassigned')}
          teams={unassigned}
          t={t}
        />
      )}
    </div>
  );
}

function TeamsGroup({
  title,
  teams,
  t,
}: {
  title: string;
  teams: PublicTeam[];
  t: (k: string) => string;
}): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {teams.map((team) => (
            <li
              key={team.id}
              className="flex items-center justify-between gap-3"
            >
              <span className="flex items-center gap-2 text-sm">
                <TeamAvatar team={team} size="sm" />
                {team.name}
                {team.level && (
                  <Badge variant="outline" className="text-xs">
                    {team.level}
                  </Badge>
                )}
              </span>
              <Badge
                variant={team.status === 'paid' ? 'default' : 'secondary'}
              >
                {team.status === 'paid'
                  ? t('public.teamsList.paidBadge')
                  : t('public.teamsList.reservedBadge')}
              </Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
