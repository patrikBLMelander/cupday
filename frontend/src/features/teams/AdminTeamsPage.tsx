import { useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { TeamAvatar } from '@/components/TeamAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGetCupQuery } from '@/features/cups/cupsApi';
import {
  useListAdminTeamsByCupQuery,
  useUpdateTeamMutation,
} from '@/features/teams/teamsApi';
import {
  ALL_GROUP_LABELS,
  groupLabelsFor,
  type GroupLabel,
  type Team,
  type TeamStatus,
} from '@/features/teams/teamTypes';

type Filter = 'all' | TeamStatus;

const STATUS_LABEL_KEY: Record<TeamStatus, string> = {
  reserved: 'admin.teams.statusReserved',
  paid: 'admin.teams.statusPaid',
  cancelled: 'admin.teams.statusCancelled',
};

const STATUS_VARIANT: Record<TeamStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  reserved: 'secondary',
  paid: 'default',
  cancelled: 'outline',
};

export function AdminTeamsPage(): JSX.Element {
  const { t } = useTranslation();
  const { id = '' } = useParams<{ id: string }>();
  const { data: cup } = useGetCupQuery(id, { skip: !id });
  const { data: teams, isLoading } = useListAdminTeamsByCupQuery(id, {
    skip: !id,
  });
  const [updateTeam, { isLoading: isMutating }] = useUpdateTeamMutation();
  const [filter, setFilter] = useState<Filter>('all');

  const filteredTeams = (teams ?? []).filter((team) =>
    filter === 'all' ? true : team.status === filter,
  );

  function handleMarkPaid(team: Team): void {
    void updateTeam({
      id: team.id,
      cupId: team.cupId,
      patch: { status: 'paid' },
    });
  }

  function handleCancel(team: Team): void {
    if (!window.confirm(t('admin.teams.actions.confirmCancel'))) return;
    void updateTeam({
      id: team.id,
      cupId: team.cupId,
      patch: { status: 'cancelled' },
    });
  }

  function handleGroupChange(
    team: Team,
    event: ChangeEvent<HTMLSelectElement>,
  ): void {
    const value = event.target.value;
    const groupLabel: GroupLabel | null =
      (ALL_GROUP_LABELS as readonly string[]).includes(value)
        ? (value as GroupLabel)
        : null;
    void updateTeam({
      id: team.id,
      cupId: team.cupId,
      patch: { groupLabel },
    });
  }

  function handleEditLogo(team: Team): void {
    const next = window.prompt(
      t('admin.teams.actions.editLogoPrompt'),
      team.logoUrl ?? '',
    );
    if (next === null) return; // user pressed Cancel
    void updateTeam({
      id: team.id,
      cupId: team.cupId,
      patch: { logoUrl: next.trim() },
    });
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
          <Link to={cup ? `/admin/cups/${cup.id}` : '/admin'}>
            ← {t('admin.cup.backToOverview')}
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('admin.teams.title')}
          {cup && (
            <span className="ml-2 text-base font-normal text-muted-foreground">
              {cup.name}
            </span>
          )}
        </h1>
      </div>

      <FilterBar filter={filter} setFilter={setFilter} t={t} />

      {isLoading && (
        <p role="status" className="text-muted-foreground">
          {t('common.loading')}
        </p>
      )}

      {!isLoading && filteredTeams.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {t('admin.teams.emptyState')}
          </CardContent>
        </Card>
      )}

      <ul className="flex flex-col gap-2">
        {filteredTeams.map((team) => (
          <li key={team.id}>
            <Card>
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <TeamAvatar team={team} size="sm" />
                    <div className="flex flex-col">
                      <span className="text-base font-medium">{team.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {team.clubName}
                      </span>
                    </div>
                  </div>
                  <Badge variant={STATUS_VARIANT[team.status]}>
                    {t(STATUS_LABEL_KEY[team.status])}
                  </Badge>
                </div>

                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {team.contactName}
                  </span>
                  {' · '}
                  <a
                    href={`mailto:${team.contactEmail}`}
                    className="underline"
                  >
                    {team.contactEmail}
                  </a>
                  {' · '}
                  <a
                    href={`tel:${team.contactPhone}`}
                    className="underline"
                  >
                    {team.contactPhone}
                  </a>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {team.status === 'paid' && (
                    <label className="flex items-center gap-2 text-sm">
                      <span>{t('admin.teams.columns.group')}:</span>
                      <select
                        value={team.groupLabel ?? ''}
                        onChange={(e) => handleGroupChange(team, e)}
                        className="rounded border border-input bg-background px-2 py-1 text-sm"
                        aria-label={t('admin.teams.columns.group')}
                      >
                        <option value="">{t('admin.teams.groupNone')}</option>
                        {groupLabelsFor(cup?.numberOfGroups ?? 2).map((label) => (
                          <option key={label} value={label}>
                            {t('admin.teams.groupLabel', { label })}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <div className="ml-auto flex items-center gap-2">
                    {team.status !== 'cancelled' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={isMutating}
                        onClick={() => handleEditLogo(team)}
                      >
                        {t('admin.teams.actions.editLogo')}
                      </Button>
                    )}
                    {team.status === 'reserved' && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={isMutating}
                        onClick={() => handleMarkPaid(team)}
                      >
                        {t('admin.teams.actions.markPaid')}
                      </Button>
                    )}
                    {(team.status === 'reserved' || team.status === 'paid') && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isMutating}
                        onClick={() => handleCancel(team)}
                      >
                        {t('admin.teams.actions.cancel')}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FilterBar({
  filter,
  setFilter,
  t,
}: {
  filter: Filter;
  setFilter: (f: Filter) => void;
  t: (k: string) => string;
}): JSX.Element {
  const options: Array<{ value: Filter; labelKey: string }> = [
    { value: 'all', labelKey: 'admin.teams.filterAll' },
    { value: 'reserved', labelKey: 'admin.teams.filterReserved' },
    { value: 'paid', labelKey: 'admin.teams.filterPaid' },
    { value: 'cancelled', labelKey: 'admin.teams.filterCancelled' },
  ];
  return (
    <nav aria-label="filter" className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <Button
          key={opt.value}
          type="button"
          size="sm"
          variant={filter === opt.value ? 'default' : 'outline'}
          aria-pressed={filter === opt.value}
          onClick={() => setFilter(opt.value)}
        >
          {t(opt.labelKey)}
        </Button>
      ))}
    </nav>
  );
}
